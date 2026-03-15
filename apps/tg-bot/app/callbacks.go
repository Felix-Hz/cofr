package app

import (
	"fmt"
	"log"
	"strings"
	"time"

	. "remind0/db"
	r "remind0/repository"

	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/uuid"
)

// HandleCallbackQuery dispatches Telegram inline keyboard callbacks.
func HandleCallbackQuery(bot *telegramClient.BotAPI, query *telegramClient.CallbackQuery) {
	chatID := query.Message.Chat.ID
	messageID := query.Message.MessageID
	data := query.Data

	log.Printf("✅ Callback: chat=%d data=%s", chatID, data)

	// Always answer the callback to remove the loading indicator
	bot.Request(telegramClient.NewCallback(query.ID, ""))

	parts := strings.SplitN(data, ":", 2)
	if len(parts) < 2 {
		return
	}

	action, param := parts[0], parts[1]

	switch action {
	case "cat":
		handleCategoryCallback(bot, chatID, messageID, param)
	case "cur":
		handleCurrencyCallback(bot, chatID, messageID, param)
	case "cfm":
		handleConfirmCallback(bot, chatID, messageID)
	case "cnl":
		handleCancelCallback(bot, chatID, messageID)
	case "note":
		handleNotesCallback(bot, chatID, messageID)
	case "undo":
		handleUndoCallback(bot, chatID, messageID, param)
	case "del":
		handleDeleteConfirmCallback(bot, chatID, messageID, param)
	case "edt":
		handleEditSelectCallback(bot, chatID, messageID, param)
	case "edf":
		handleEditFieldCallback(bot, chatID, messageID, param)
	case "acct":
		handleAccountCallback(bot, chatID, messageID, param)
	case "tcfm":
		handleTransferConfirmCallback(bot, chatID, messageID)
	case "tcur":
		handleTransferCurrencyCallback(bot, chatID, messageID, param)
	case "tnote":
		handleTransferNotesCallback(bot, chatID, messageID)
	case "sum":
		handleSummaryCallback(bot, chatID, messageID, param)
	case "hlp":
		handleHelpCallback(bot, chatID, messageID, param)
	}
}

// --- Category selection (guided add flow) ---

func handleCategoryCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, shortID string) {
	session := Sessions.Get(chatID)
	if session == nil {
		return
	}

	catID, ok := session.IDMap[shortID]
	if !ok {
		return
	}

	// Look up category name
	cats, err := r.CategoryRepo().GetForUser(session.UserID)
	if err != nil {
		return
	}
	for _, cat := range cats {
		if cat.ID == catID {
			session.CategoryID = catID
			session.CategoryName = cat.Name
			if cat.Icon != nil {
				session.CategoryIcon = *cat.Icon
			}
			break
		}
	}

	session.MessageID = messageID

	// If editing, go back to edit details; otherwise continue guided add
	if session.Flow == FlowEdit {
		session.Step = StepEditField
		Sessions.Set(chatID, session)
		showEditDetails(bot, chatID, messageID, session)
		return
	}

	session.Step = StepEnterAmount
	Sessions.Set(chatID, session)

	label := session.CategoryName
	if session.CategoryIcon != "" {
		label = session.CategoryIcon + " " + label
	}

	text := fmt.Sprintf("<b>%s</b>\n\nEnter the amount:", escapeHTML(label))
	editHTML(bot, chatID, messageID, text, nil)
}

// --- Currency selection ---

func handleCurrencyCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, param string) {
	session := Sessions.Get(chatID)
	if session == nil {
		return
	}

	if param == "pick" {
		// Show currency picker
		user, err := r.UserRepo().GetByID(session.UserID)
		if err != nil {
			return
		}
		kb := buildCurrencyKeyboard(user.PreferredCurrency)
		text := "Select currency:"
		editHTML(bot, chatID, messageID, text, &kb)
		return
	}

	// Currency selected
	session.Currency = param
	session.MessageID = messageID
	Sessions.Set(chatID, session)

	// If we're in the add flow confirm step, show confirmation again
	if session.Flow == FlowAdd && (session.Step == StepConfirm || session.Step == StepSelectCurrency) {
		session.Step = StepConfirm
		Sessions.Set(chatID, session)
		showAddConfirmation(bot, chatID, messageID, session)
		return
	}

	// If editing currency
	if session.Flow == FlowEdit && session.Step == StepEditCurrency {
		session.Step = StepEditField
		Sessions.Set(chatID, session)
		showEditDetails(bot, chatID, messageID, session)
	}

	// If transfer currency
	if session.Flow == FlowTransfer {
		session.Step = StepTransferConfirm
		Sessions.Set(chatID, session)
		showTransferConfirmation(bot, chatID, messageID, session)
	}
}

// --- Confirm add ---

func handleConfirmCallback(bot *telegramClient.BotAPI, chatID int64, messageID int) {
	session := Sessions.Get(chatID)
	if session == nil {
		return
	}

	if session.Flow == FlowAdd {
		commitGuidedAdd(bot, chatID, messageID, session)
	}
}

func commitGuidedAdd(bot *telegramClient.BotAPI, chatID int64, messageID int, session *FlowSession) {
	timestamp := time.Now()
	hash := generateMessageHash(session.CategoryID, session.Amount, session.Notes, timestamp, session.UserID, 0, session.Currency)

	// Check duplicate
	existing, err := r.TxRepo().GetByHash(hash, session.UserID)
	if existing != nil && err == nil {
		editHTML(bot, chatID, messageID, "Duplicate transaction.", nil)
		Sessions.Delete(chatID)
		return
	}

	// Resolve account
	user, err := r.UserRepo().GetByID(session.UserID)
	if err != nil {
		editHTML(bot, chatID, messageID, "Failed to load user data.", nil)
		Sessions.Delete(chatID)
		return
	}
	accountID := resolveAccountID(user)
	catID := session.CategoryID

	txs, err := r.TxRepo().Create([]*Transaction{{
		Hash:          hash,
		Notes:         session.Notes,
		UserID:        session.UserID,
		Amount:        session.Amount,
		Currency:      session.Currency,
		CategoryID:    &catID,
		AccountID:     accountID,
		Timestamp:     timestamp,
		ReceiptFileID: nilIfEmpty(session.ReceiptFileID),
	}})
	if err != nil {
		log.Printf("⚠️ Guided add error: %v", err)
		editHTML(bot, chatID, messageID, "Failed to save transaction.", nil)
		Sessions.Delete(chatID)
		return
	}

	Sessions.Delete(chatID)

	tx := txs[0]
	text := formatHTMLReceipt(Add, tx)
	kb := buildUndoKeyboard(tx.ID)
	editHTML(bot, chatID, messageID, text, &kb)
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// --- Notes prompt ---

func handleNotesCallback(bot *telegramClient.BotAPI, chatID int64, messageID int) {
	session := Sessions.Get(chatID)
	if session == nil {
		return
	}

	if session.Flow == FlowAdd {
		session.Step = StepEnterNotes
		session.MessageID = messageID
		Sessions.Set(chatID, session)
		editHTML(bot, chatID, messageID, "Type your notes:", nil)
	}
}

// --- Cancel ---

func handleCancelCallback(bot *telegramClient.BotAPI, chatID int64, messageID int) {
	Sessions.Delete(chatID)
	editHTML(bot, chatID, messageID, "Cancelled.", nil)
}

// --- Undo (delete after add) ---

func handleUndoCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, txIDStr string) {
	txID, err := uuid.Parse(txIDStr)
	if err != nil {
		return
	}

	// Look up user
	user, err := r.UserRepo().GetByTelegramID(chatID)
	if err != nil {
		return
	}

	tx, err := r.TxRepo().GetById(txID, user.ID)
	if err != nil {
		editHTML(bot, chatID, messageID, "Transaction not found.", nil)
		return
	}

	if err := r.TxRepo().Delete([]*Transaction{tx}); err != nil {
		editHTML(bot, chatID, messageID, "Failed to undo.", nil)
		return
	}

	editHTML(bot, chatID, messageID, "Transaction undone.", nil)
}

// --- Delete confirmation ---

func handleDeleteConfirmCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, txIDStr string) {
	txID, err := uuid.Parse(txIDStr)
	if err != nil {
		return
	}

	user, err := r.UserRepo().GetByTelegramID(chatID)
	if err != nil {
		return
	}

	tx, err := r.TxRepo().GetById(txID, user.ID)
	if err != nil {
		editHTML(bot, chatID, messageID, "Transaction not found.", nil)
		return
	}

	if err := r.TxRepo().Delete([]*Transaction{tx}); err != nil {
		editHTML(bot, chatID, messageID, "Failed to delete.", nil)
		return
	}

	editHTML(bot, chatID, messageID, "Transaction deleted.", nil)
}

// --- Edit: select transaction ---

func handleEditSelectCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, shortID string) {
	session := Sessions.Get(chatID)
	if session == nil {
		return
	}

	txID, ok := session.IDMap[shortID]
	if !ok {
		return
	}

	tx, err := r.TxRepo().GetById(txID, session.UserID)
	if err != nil {
		editHTML(bot, chatID, messageID, "Transaction not found.", nil)
		Sessions.Delete(chatID)
		return
	}

	// Look up category name
	if tx.CategoryID != nil {
		cats, _ := r.CategoryRepo().GetForUser(session.UserID)
		for _, cat := range cats {
			if cat.ID == *tx.CategoryID {
				session.CategoryName = cat.Name
				if cat.Icon != nil {
					session.CategoryIcon = *cat.Icon
				}
				break
			}
		}
		session.CategoryID = *tx.CategoryID
	}

	session.TransactionID = txID
	session.Amount = tx.Amount
	session.Currency = tx.Currency
	session.Notes = tx.Notes
	session.Step = StepEditField
	session.MessageID = messageID
	Sessions.Set(chatID, session)

	showEditDetails(bot, chatID, messageID, session)
}

// --- Edit: field actions ---

func handleEditFieldCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, field string) {
	session := Sessions.Get(chatID)
	if session == nil {
		return
	}

	switch field {
	case "amount":
		session.Step = StepEditAmount
		session.MessageID = messageID
		Sessions.Set(chatID, session)
		editHTML(bot, chatID, messageID, "Enter new amount:", nil)

	case "category":
		session.Step = StepEditCategory
		kb, idMap, err := buildCategoryKeyboard(session.UserID)
		if err != nil {
			return
		}
		session.IDMap = idMap
		session.MessageID = messageID
		Sessions.Set(chatID, session)
		editHTML(bot, chatID, messageID, "Select new category:", &kb)

	case "currency":
		session.Step = StepEditCurrency
		session.MessageID = messageID
		Sessions.Set(chatID, session)
		user, _ := r.UserRepo().GetByID(session.UserID)
		kb := buildCurrencyKeyboard(user.PreferredCurrency)
		editHTML(bot, chatID, messageID, "Select new currency:", &kb)

	case "notes":
		session.Step = StepEditNotes
		session.MessageID = messageID
		Sessions.Set(chatID, session)
		editHTML(bot, chatID, messageID, "Enter new notes (or send a dash - to clear):", nil)

	case "save":
		commitEdit(bot, chatID, messageID, session)
	}
}

func commitEdit(bot *telegramClient.BotAPI, chatID int64, messageID int, session *FlowSession) {
	tx, err := r.TxRepo().GetById(session.TransactionID, session.UserID)
	if err != nil {
		editHTML(bot, chatID, messageID, "Transaction not found.", nil)
		Sessions.Delete(chatID)
		return
	}

	tx.Amount = session.Amount
	tx.Currency = session.Currency
	tx.Notes = session.Notes
	catID := session.CategoryID
	tx.CategoryID = &catID

	if err := r.TxRepo().Update(tx); err != nil {
		log.Printf("⚠️ Edit error: %v", err)
		editHTML(bot, chatID, messageID, "Failed to save changes.", nil)
		Sessions.Delete(chatID)
		return
	}

	Sessions.Delete(chatID)
	editHTML(bot, chatID, messageID, "Transaction updated.", nil)
}

func showEditDetails(bot *telegramClient.BotAPI, chatID int64, messageID int, session *FlowSession) {
	label := session.CategoryName
	if session.CategoryIcon != "" {
		label = session.CategoryIcon + " " + label
	}

	notes := session.Notes
	if notes == "" {
		notes = "-"
	}

	text := fmt.Sprintf(
		"<b>Edit Transaction</b>\n\n"+
			"<b>Category:</b> %s\n"+
			"<b>Amount:</b> %.2f %s\n"+
			"<b>Notes:</b> %s",
		escapeHTML(label), session.Amount, session.Currency, escapeHTML(notes))

	kb := buildEditFieldKeyboard()
	editHTML(bot, chatID, messageID, text, &kb)
}

// --- Account selection (transfer flow) ---

func handleAccountCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, shortID string) {
	session := Sessions.Get(chatID)
	if session == nil || session.Flow != FlowTransfer {
		return
	}

	acctID, ok := session.IDMap[shortID]
	if !ok {
		return
	}

	// Look up account name
	acct, err := r.AccountRepo().GetByID(acctID, session.UserID)
	if err != nil {
		return
	}

	session.MessageID = messageID

	if session.Step == StepSelectFromAccount {
		session.FromAccountID = acctID
		session.FromAccountName = acct.Name
		session.Step = StepSelectToAccount

		// Build account keyboard excluding the "from" account
		kb, idMap, err := buildAccountKeyboard(session.UserID, acctID)
		if err != nil || len(idMap) == 0 {
			editHTML(bot, chatID, messageID, "No other accounts available.", nil)
			Sessions.Delete(chatID)
			return
		}
		session.IDMap = idMap
		Sessions.Set(chatID, session)

		text := fmt.Sprintf("<b>Transfer from %s</b>\n\nSelect the <b>to</b> account:",
			escapeHTML(acct.Name))
		editHTML(bot, chatID, messageID, text, &kb)

	} else if session.Step == StepSelectToAccount {
		session.ToAccountID = acctID
		session.ToAccountName = acct.Name
		session.Step = StepTransferAmount
		Sessions.Set(chatID, session)

		text := fmt.Sprintf("<b>%s → %s</b>\n\nEnter the amount:",
			escapeHTML(session.FromAccountName), escapeHTML(acct.Name))
		editHTML(bot, chatID, messageID, text, nil)
	}
}

// --- Transfer confirm ---

func handleTransferConfirmCallback(bot *telegramClient.BotAPI, chatID int64, messageID int) {
	session := Sessions.Get(chatID)
	if session == nil || session.Flow != FlowTransfer {
		return
	}
	commitTransfer(bot, chatID, messageID, session)
}

func commitTransfer(bot *telegramClient.BotAPI, chatID int64, messageID int, session *FlowSession) {
	timestamp := time.Now()

	// Generate hashes for both sides
	hashFrom := generateMessageHash(session.FromAccountID, session.Amount, session.Notes, timestamp, session.UserID, 0, session.Currency)
	hashTo := generateMessageHash(session.ToAccountID, session.Amount, session.Notes, timestamp, session.UserID, 1, session.Currency)

	dirFrom := "from"
	dirTo := "to"

	fromTx := &Transaction{
		Hash:              hashFrom,
		Notes:             session.Notes,
		UserID:            session.UserID,
		Amount:            session.Amount,
		Currency:          session.Currency,
		AccountID:         session.FromAccountID,
		IsTransfer:        true,
		TransferDirection: &dirFrom,
		Timestamp:         timestamp,
	}

	toTx := &Transaction{
		Hash:              hashTo,
		Notes:             session.Notes,
		UserID:            session.UserID,
		Amount:            session.Amount,
		Currency:          session.Currency,
		AccountID:         session.ToAccountID,
		IsTransfer:        true,
		TransferDirection: &dirTo,
		Timestamp:         timestamp,
	}

	// Create both transactions
	txs, err := r.TxRepo().Create([]*Transaction{fromTx, toTx})
	if err != nil {
		log.Printf("⚠️ Transfer error: %v", err)
		editHTML(bot, chatID, messageID, "Failed to save transfer.", nil)
		Sessions.Delete(chatID)
		return
	}

	// Link them together
	if len(txs) == 2 {
		txs[0].LinkedTransactionID = &txs[1].ID
		txs[1].LinkedTransactionID = &txs[0].ID
		r.TxRepo().Update(txs[0])
		r.TxRepo().Update(txs[1])
	}

	Sessions.Delete(chatID)

	text := fmt.Sprintf(
		"<b>Transfer Complete</b>\n\n"+
			"<b>%s → %s</b>\n"+
			"<code>$%.2f %s</code>\n"+
			"🕒 %s",
		escapeHTML(session.FromAccountName), escapeHTML(session.ToAccountName),
		session.Amount, session.Currency,
		timestamp.Format("02 Jan 2006 15:04"),
	)
	if session.Notes != "" {
		text += fmt.Sprintf("\n📌 %s", escapeHTML(session.Notes))
	}

	kb := buildUndoKeyboard(txs[0].ID)
	editHTML(bot, chatID, messageID, text, &kb)
}

func handleTransferCurrencyCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, param string) {
	session := Sessions.Get(chatID)
	if session == nil || session.Flow != FlowTransfer {
		return
	}

	if param == "pick" {
		user, err := r.UserRepo().GetByID(session.UserID)
		if err != nil {
			return
		}
		kb := buildCurrencyKeyboard(user.PreferredCurrency)
		// Override callback prefix to use tcur instead of cur
		editHTML(bot, chatID, messageID, "Select currency:", &kb)
		return
	}

	session.Currency = param
	session.MessageID = messageID
	session.Step = StepTransferConfirm
	Sessions.Set(chatID, session)
	showTransferConfirmation(bot, chatID, messageID, session)
}

func handleTransferNotesCallback(bot *telegramClient.BotAPI, chatID int64, messageID int) {
	session := Sessions.Get(chatID)
	if session == nil || session.Flow != FlowTransfer {
		return
	}

	session.Step = StepTransferNotes
	session.MessageID = messageID
	Sessions.Set(chatID, session)
	editHTML(bot, chatID, messageID, "Type your notes:", nil)
}

// showTransferConfirmation shows the confirmation view during guided transfer.
func showTransferConfirmation(bot *telegramClient.BotAPI, chatID int64, messageID int, session *FlowSession) {
	text := fmt.Sprintf("<b>%s → %s</b> — $%.2f %s",
		escapeHTML(session.FromAccountName), escapeHTML(session.ToAccountName),
		session.Amount, session.Currency)
	if session.Notes != "" {
		text += fmt.Sprintf("\n📌 %s", escapeHTML(session.Notes))
	}

	kb := buildTransferConfirmKeyboard()
	editHTML(bot, chatID, messageID, text, &kb)
}

// --- Summary callbacks ---

func handleSummaryCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, param string) {
	user, err := r.UserRepo().GetByTelegramID(chatID)
	if err != nil {
		return
	}

	now := time.Now()

	switch param {
	case "full":
		from, to := currentMonthRange(now)
		result, err := r.TxRepo().GetSummary(user.ID, from, to)
		if err != nil {
			return
		}
		text := formatFullBreakdown(result, from, to)
		kb := buildSummaryKeyboard()
		editHTML(bot, chatID, messageID, text, &kb)

	case "prev":
		from, to := previousMonthRange(now)
		text, _, err := summaryForMonth(user.ID, from, to)
		if err != nil {
			return
		}
		kb := buildSummaryKeyboard()
		editHTML(bot, chatID, messageID, text, &kb)
	}
}

// --- Help callbacks ---

func handleHelpCallback(bot *telegramClient.BotAPI, chatID int64, messageID int, topic string) {
	var text string

	user, _ := r.UserRepo().GetByTelegramID(chatID)

	switch topic {
	case "add":
		text = userHelp[HelpTopic{Command: Add}]
	case "list":
		text = userHelp[HelpTopic{Command: List}]
	case "remove":
		text = userHelp[HelpTopic{Command: Remove}]
	case "summary":
		text = helpSummaryText
	case "edit":
		text = helpEditText
	case "transfer":
		text = helpTransferText
	case "config":
		text = userHelp[HelpTopic{Command: Configuration}]
	case "categories":
		if user != nil {
			text = getCategoriesMessageForUser(user.ID)
		} else {
			text = "Please link your account first."
		}
	case "currencies":
		text = userHelp[HelpTopic{Command: Help, Subtopic: "Currencies"}]
	default:
		text = "Unknown topic."
	}

	kb := buildHelpTopicsKeyboard()
	editHTML(bot, chatID, messageID, escapeHTML(text), &kb)
}

// showAddConfirmation shows the confirmation view during guided add.
func showAddConfirmation(bot *telegramClient.BotAPI, chatID int64, messageID int, session *FlowSession) {
	label := session.CategoryName
	if session.CategoryIcon != "" {
		label = session.CategoryIcon + " " + label
	}

	text := fmt.Sprintf("<b>%s</b> — $%.2f %s",
		escapeHTML(label), session.Amount, session.Currency)
	if session.Notes != "" {
		text += fmt.Sprintf("\n📌 %s", escapeHTML(session.Notes))
	}

	kb := buildConfirmKeyboard()
	editHTML(bot, chatID, messageID, text, &kb)
}
