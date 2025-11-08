package app

import (
	"fmt"
	. "remind0/db"
	r "remind0/repository"
	"strconv"
	"strings"
	"time"
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
)

type CommandResult struct {
	Error        error
	UserError    string
	UserInfo     string
	Command      Command
	Transactions []*Transaction           // Optional as not all commands return a transaction.
	Aggregated   []AggregatedTransactions // Optional as not all commands return aggregated data.
}

/**
 * Dispatcher that handles incoming commands from the user.
 */
func dispatch(msg string, timestamp time.Time, userId uint) CommandResult {
	switch content := strings.Fields(msg); content[0] {
	case "add", "a":
		return add(strings.Join(content[1:], ""), timestamp, userId)
	case "remove", "rm", "r", "delete", "del", "d":
		return remove(content[1:], userId)
	case "list", "ls", "l":
		return list(content, timestamp, userId)
	case "help", "h":
		return help(content)
	case "config", "c", "cfg":
		return config(content[1:], userId)
	case "edit", "e", "update", "u":
		return CommandResult{Command: Edit, Error: fmt.Errorf("edit not implemented"), UserError: userErrors[Edit]}
	default:
		return CommandResult{Command: Unknown, Error: fmt.Errorf("%s not implemented", content[0]), UserError: userErrors[Unknown]}
	}
}

func add(body string, timestamp time.Time, userId uint) CommandResult {

	/**
	 * Get user to retrieve preferred currency.
	 */
	user, err := r.UserRepo().GetByID(userId)
	if err != nil {
		return CommandResult{Command: Add, Error: err, UserError: userErrors[Unknown]}
	}

	/**
	 * Process incoming add-request message.
	 */
	category, amounts, notes, currency, err := parseAddTx(body, user.PreferredCurrency)
	if err != nil {
		return CommandResult{Command: Add, Error: err, UserError: userErrors[Add]}
	}

	/**
	 * Setup required transactions to be created.
	 */
	_txs := []*Transaction{}
	for i, amount := range amounts {
		// Hash message to prevent duplicates. Include batch index and currency to allow duplicate amounts.
		hash := generateMessageHash(category, amount, notes, timestamp, userId, i, currency)

		// Validate transaction uniqueness.
		_tx, err := r.TxRepo().GetByHash(hash, userId)
		if _tx != nil && err == nil {
			return CommandResult{Command: Add, Error: fmt.Errorf("duplicate transaction"), UserError: userErrors[Unknown]}
		}

		_txs = append(_txs, &Transaction{
			Hash:      hash,
			Notes:     notes,
			UserID:    userId,
			Amount:    amount,
			Currency:  currency,
			Category:  category,
			Timestamp: timestamp,
		})
	}

	/**
	 * Create the transaction(s).
	 */
	txs, err := r.TxRepo().Create(_txs)
	if err != nil {
		return CommandResult{Command: Add, Error: err, UserError: userErrors[Unknown]}
	}

	return CommandResult{Transactions: txs, Command: Add, Error: nil}
}

func remove(strIds []string, userId uint) CommandResult {

	// Slice to hold validated IDs to delete
	ids := []int64{}

	/**
	 * Validate and convert txId to int64
	 */
	for _, strId := range strIds {
		id, err := strconv.ParseInt(strId, 10, 64)
		if err != nil {
			return CommandResult{Command: Remove, Error: fmt.Errorf("ID must be a number"), UserError: userErrors[Remove]}
		}
		ids = append(ids, id)
	}

	/**
	 * Verify the transaction exists
	 */
	txs, err := r.TxRepo().GetManyById(ids, userId)
	if len(txs) == 0 || err != nil {
		return CommandResult{Command: Remove, Error: fmt.Errorf("IDs %v not found: %s", ids, err), UserError: userErrors[Remove]}
	}

	/**
	 * Delete the transaction
	 */
	if err := r.TxRepo().Delete(txs); err != nil {
		return CommandResult{Command: Remove, Error: fmt.Errorf("failed to delete IDs %v: %s", ids, err), UserError: userErrors[Unknown]}
	}

	return CommandResult{Transactions: txs, Command: Remove, Error: nil}
}

func list(body []string, timestamp time.Time, userId uint) CommandResult {

	opts, err := parseListOptions(body, timestamp)
	if err != nil {
		return CommandResult{
			Command:   List,
			Error:     err,
			UserError: userErrors[List],
		}
	}

	// Handle category filtering
	if opts.Category != "" {
		txs, err := r.TxRepo().GetManyByCategory(userId, opts.Category, opts.FromTime, opts.Limit)
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

func help(args []string) CommandResult {
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
	case "categories", "cats":
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: Help, Subtopic: "Categories"}]}
	case "currencies", "curr":
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: Help, Subtopic: "Currencies"}]}
	case "config", "cfg":
		return CommandResult{Command: Help, UserInfo: userHelp[HelpTopic{Command: Configuration}]}
	case "edit", "e", "update", "u":
		return CommandResult{Command: Help, UserError: userErrors[Edit]}
	default:
		return CommandResult{Command: Help, UserError: "Unknown command. Available commands are: add, rm, ls, help, config, edit."}
	}
}

func config(args []string, userId uint) CommandResult {
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
				UserError: "Invalid currency code. Use !help currencies for supported currencies.",
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
			UserInfo: fmt.Sprintf("✅ Default currency set to %s (%s)", currencyCode, supportedCurrencies[currencyCode]),
		}

	default:
		return CommandResult{
			Command:   Configuration,
			Error:     fmt.Errorf("unknown config action: %s", action),
			UserError: "Unknown config option. Use !help config for guidance.",
		}
	}
}
