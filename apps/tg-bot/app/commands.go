package app

import (
	"fmt"
	. "remind0/db"
	r "remind0/repository"
	"strings"
	"time"

	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/uuid"
)

type Command string

const (
	Add           Command = "add"
	Remove        Command = "rm"
	Unknown       Command = "unknown"
	List          Command = "ls"
	Help          Command = "h"
	Edit          Command = "e"
	Configuration Command = "config"
	Summary       Command = "summary"
	Transfer      Command = "transfer"
)

type CommandResult struct {
	Error        error
	UserError    string
	UserInfo     string
	Command      Command
	Transactions []*Transaction           // Optional as not all commands return a transaction.
	Aggregated   []AggregatedTransactions // Optional as not all commands return aggregated data.
}

// startGuidedAdd begins the guided add flow (no args) — sends category picker.
func startGuidedAdd(bot *telegramClient.BotAPI, chatID int64, userID uuid.UUID) {
	user, err := r.UserRepo().GetByID(userID)
	if err != nil {
		sendHTML(bot, chatID, "Failed to load user data.")
		return
	}

	kb, idMap, err := buildCategoryKeyboard(userID)
	if err != nil {
		sendHTML(bot, chatID, "Failed to load categories.")
		return
	}

	Sessions.Set(chatID, &FlowSession{
		Flow:     FlowAdd,
		Step:     StepSelectCategory,
		UserID:   userID,
		Currency: user.PreferredCurrency,
		IDMap:    idMap,
	})

	sendHTMLWithKeyboard(bot, chatID, "Select a category:", kb)
}

// startEditFlow begins the edit flow — shows last 5 transactions.
func startEditFlow(bot *telegramClient.BotAPI, chatID int64, userID uuid.UUID) {
	txs, err := r.TxRepo().GetRecent(userID, 5)
	if err != nil || len(txs) == 0 {
		sendHTML(bot, chatID, "No recent transactions to edit.")
		return
	}

	kb, idMap := buildEditTransactionKeyboard(txs)
	Sessions.Set(chatID, &FlowSession{
		Flow:   FlowEdit,
		Step:   StepSelectTransaction,
		UserID: userID,
		IDMap:  idMap,
	})

	sendHTMLWithKeyboard(bot, chatID, "<b>Select a transaction to edit:</b>", kb)
}

// startRemoveFlow begins the remove flow — shows last 5 transactions with delete confirmation.
func startRemoveFlow(bot *telegramClient.BotAPI, chatID int64, userID uuid.UUID) {
	txs, err := r.TxRepo().GetRecent(userID, 5)
	if err != nil || len(txs) == 0 {
		sendHTML(bot, chatID, "No recent transactions to delete.")
		return
	}

	// Show each transaction with a delete confirmation button
	for _, tx := range txs {
		text := formatHTMLReceipt(Remove, tx)
		kb := buildDeleteConfirmKeyboard(tx.ID)
		sendHTMLWithKeyboard(bot, chatID, text, kb)
	}
}

// startGuidedTransfer begins the guided transfer flow — shows account picker for "from" account.
func startGuidedTransfer(bot *telegramClient.BotAPI, chatID int64, userID uuid.UUID) {
	user, err := r.UserRepo().GetByID(userID)
	if err != nil {
		sendHTML(bot, chatID, "Failed to load user data.")
		return
	}

	kb, idMap, err := buildAccountKeyboard(userID, uuid.Nil)
	if err != nil || len(idMap) == 0 {
		sendHTML(bot, chatID, "No accounts found. Create accounts in Settings first.")
		return
	}

	Sessions.Set(chatID, &FlowSession{
		Flow:     FlowTransfer,
		Step:     StepSelectFromAccount,
		UserID:   userID,
		Currency: user.PreferredCurrency,
		IDMap:    idMap,
	})

	sendHTMLWithKeyboard(bot, chatID, "<b>Transfer</b>\n\nSelect the <b>from</b> account:", kb)
}

func add(body string, timestamp time.Time, userId uuid.UUID) CommandResult {

	// Get user to retrieve preferred currency.
	user, err := r.UserRepo().GetByID(userId)
	if err != nil {
		return CommandResult{Command: Add, Error: err, UserError: userErrors[Unknown]}
	}

	// Process incoming add-request message.
	category, amounts, notes, currency, err := parseAddTx(body, user.PreferredCurrency, userId)
	if err != nil {
		return CommandResult{Command: Add, Error: err, UserError: userErrors[Add]}
	}

	// Resolve account ID (use default or first account)
	accountID := resolveAccountID(user)

	// Setup required transactions to be created.
	_txs := []*Transaction{}
	for i, amount := range amounts {
		// Hash message to prevent duplicates. Include batch index and currency to allow duplicate amounts.
		hash := generateMessageHash(category.ID, amount, notes, timestamp, userId, i, currency)

		// Validate transaction uniqueness.
		_tx, err := r.TxRepo().GetByHash(hash, userId)
		if _tx != nil && err == nil {
			return CommandResult{Command: Add, Error: fmt.Errorf("duplicate transaction"), UserError: userErrors[Unknown]}
		}

		catID := category.ID
		_txs = append(_txs, &Transaction{
			Hash:       hash,
			Notes:      notes,
			UserID:     userId,
			Amount:     amount,
			Currency:   currency,
			CategoryID: &catID,
			AccountID:  accountID,
			Timestamp:  timestamp,
		})
	}

	// Create the transaction(s).
	txs, err := r.TxRepo().Create(_txs)
	if err != nil {
		return CommandResult{Command: Add, Error: err, UserError: userErrors[Unknown]}
	}

	return CommandResult{Transactions: txs, Command: Add, Error: nil}
}

func remove(strIds []string, userId uuid.UUID) CommandResult {

	// Slice to hold validated IDs to delete
	ids := []uuid.UUID{}

	// Validate and convert txId to UUID
	for _, strId := range strIds {
		id, err := uuid.Parse(strId)
		if err != nil {
			return CommandResult{Command: Remove, Error: fmt.Errorf("ID must be a valid UUID"), UserError: userErrors[Remove]}
		}
		ids = append(ids, id)
	}

	// Verify the transaction exists
	txs, err := r.TxRepo().GetManyById(ids, userId)
	if len(txs) == 0 || err != nil {
		return CommandResult{Command: Remove, Error: fmt.Errorf("IDs %v not found: %s", ids, err), UserError: userErrors[Remove]}
	}

	// Delete the transaction
	if err := r.TxRepo().Delete(txs); err != nil {
		return CommandResult{Command: Remove, Error: fmt.Errorf("failed to delete IDs %v: %s", ids, err), UserError: userErrors[Unknown]}
	}

	return CommandResult{Transactions: txs, Command: Remove, Error: nil}
}

func list(body []string, timestamp time.Time, userId uuid.UUID) CommandResult {

	opts, err := parseListOptions(body, timestamp, userId)
	if err != nil {
		return CommandResult{
			Command:   List,
			Error:     err,
			UserError: userErrors[List],
		}
	}

	// Handle category filtering
	if opts.CategoryID != nil {
		txs, err := r.TxRepo().GetManyByCategory(userId, *opts.CategoryID, opts.FromTime, opts.Limit)
		if err != nil {
			return CommandResult{
				Command:   List,
				Error:     err,
				UserError: userErrors[Unknown],
			}
		}
		if opts.Aggregate {
			return CommandResult{Command: List, Aggregated: aggregateCategories(txs)}
		}
		return CommandResult{Command: List, Transactions: txs}
	}

	// Handle currency filtering
	if opts.Currency != "" {
		txs, err := r.TxRepo().GetManyByCurrency(userId, opts.Currency, opts.FromTime, opts.Limit)
		if err != nil {
			return CommandResult{
				Command:   List,
				Error:     err,
				UserError: userErrors[Unknown],
			}
		}
		if opts.Aggregate {
			return CommandResult{Command: List, Aggregated: aggregateCategories(txs)}
		}
		return CommandResult{Command: List, Transactions: txs}
	}

	// Get all transactions
	txs, err := r.TxRepo().GetAll(userId, opts.FromTime, opts.Limit)
	if err != nil {
		return CommandResult{
			Command:   List,
			Error:     err,
			UserError: userErrors[Unknown],
		}
	}
	if opts.Aggregate {
		return CommandResult{Command: List, Aggregated: aggregateCategories(txs)}
	}
	return CommandResult{Command: List, Transactions: txs}
}

func help(args []string, userId uuid.UUID) CommandResult {
	if len(args) == 1 {
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: Help}]}
	}

	switch args[1] {
	case "add", "a":
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: Add}]}
	case "remove", "rm", "r", "delete", "del", "d":
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: Remove}]}
	case "list", "ls", "l":
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: List}]}
	case "help", "h":
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: Help}]}
	case "summary", "s":
		return CommandResult{Command: Help, UserInfo: helpSummaryText}
	case "categories", "cats":
		return CommandResult{Command: Help, UserInfo: getCategoriesMessageForUser(userId)}
	case "currencies", "curr":
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: Help, Subtopic: "Currencies"}]}
	case "config", "cfg":
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: Configuration}]}
	case "edit", "e", "update", "u":
		return CommandResult{Command: Help, UserInfo: helpEditText}
	case "transfer", "t", "xfer":
		return CommandResult{Command: Help, UserInfo: helpTransferText}
	default:
		return CommandResult{Command: Help, UserError: "Unknown command. Use /help for available commands."}
	}
}

func config(args []string, userId uuid.UUID) CommandResult {
	if len(args) < 2 {
		return CommandResult{
			Command:   Configuration,
			Error:     fmt.Errorf("missing arguments"),
			UserError: userErrors[Configuration],
		}
	}

	action := args[0]

	switch action {
	case "set-default-currency", "sdc":
		currencyCode := strings.ToUpper(args[1])

		if !isValidCurrency(currencyCode) {
			return CommandResult{
				Command:   Configuration,
				Error:     fmt.Errorf("invalid currency: %s", currencyCode),
				UserError: "Invalid currency code. Use /help currencies for supported currencies.",
			}
		}

		// Update user's preferred currency
		user, err := r.UserRepo().GetByID(userId)
		if err != nil {
			return CommandResult{
				Command:   Configuration,
				Error:     err,
				UserError: userErrors[Unknown],
			}
		}

		user.PreferredCurrency = currencyCode
		if err := r.UserRepo().Update(user); err != nil {
			return CommandResult{
				Command:   Configuration,
				Error:     err,
				UserError: userErrors[Unknown],
			}
		}

		return CommandResult{
			Command:  Configuration,
			UserInfo: fmt.Sprintf("Default currency set to %s (%s)", currencyCode, supportedCurrencies[currencyCode]),
		}

	default:
		return CommandResult{
			Command:   Configuration,
			Error:     fmt.Errorf("unknown config action: %s", action),
			UserError: "Unknown config option. Use /help config for guidance.",
		}
	}
}
