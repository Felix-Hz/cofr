package app

import (
	"fmt"
	"log"
	"strings"
	"time"

	. "remind0/db"
	r "remind0/repository"

	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

// ConnectBot gets updates using long-polling. Returns a channel for updates.
func ConnectBot(bot *telegramClient.BotAPI, offset *Offset) telegramClient.UpdatesChannel {
	u := telegramClient.NewUpdate(offset.Offset)
	u.Timeout = 60
	log.Println("✅ Channel opened")
	return bot.GetUpdatesChan(u)
}

// RegisterCommands registers the bot's command menu via setMyCommands.
func RegisterCommands(bot *telegramClient.BotAPI) {
	commands := []telegramClient.BotCommand{
		{Command: "add", Description: "Record an expense or income"},
		{Command: "transfer", Description: "Transfer between accounts"},
		{Command: "list", Description: "View recent transactions"},
		{Command: "summary", Description: "Spending summary for current cycle"},
		{Command: "edit", Description: "Edit a recent transaction"},
		{Command: "remove", Description: "Delete a transaction"},
		{Command: "config", Description: "Set default currency"},
		{Command: "help", Description: "Commands and usage guide"},
	}
	cfg := telegramClient.NewSetMyCommands(commands...)
	if _, err := bot.Request(cfg); err != nil {
		log.Printf("⚠️ Failed to set bot commands: %v", err)
	} else {
		log.Println("✅ Bot commands registered")
	}
}

// HandleTelegramMessage handles incoming messages with session-aware routing.
func HandleTelegramMessage(bot *telegramClient.BotAPI, update telegramClient.Update) {
	msg := update.Message
	if msg == nil {
		return
	}

	tgUserID := msg.Chat.ID
	body := msg.Text
	timestamp := time.Unix(int64(msg.Date), 0)

	log.Printf("✅ Received message: %+v", struct {
		User      string
		Body      string
		Timestamp time.Time
	}{
		Body:      body,
		Timestamp: timestamp,
		User:      msg.From.FirstName + " " + msg.From.LastName,
	})

	// 1. Handle /start command (deep-link Telegram linking)
	if strings.HasPrefix(body, "/start") {
		handleStartCommand(bot, tgUserID, body)
		return
	}

	// 2. Handle photo messages (receipt attachment)
	if msg.Photo != nil && len(msg.Photo) > 0 {
		handlePhotoMessage(bot, msg)
		return
	}

	// 3. Check for active session — route text input to session handler
	if session := Sessions.Get(tgUserID); session != nil {
		handleSessionInput(bot, tgUserID, body, session)
		return
	}

	// 4. Handle /slash commands
	if strings.HasPrefix(body, "/") {
		handleSlashCommand(bot, tgUserID, body, timestamp)
		return
	}

	// 5. Validate the message: non-empty and within length limits
	if !validateMessage(body) {
		sendHTML(bot, tgUserID, "Message cannot be empty or exceed 500 characters.")
		return
	}

	// 6. Verify user is registered
	user, err := r.UserRepo().GetByTelegramID(tgUserID)
	if err != nil {
		log.Printf("⚠️ Unregistered user attempted access: %d", tgUserID)
		sendHTML(bot, tgUserID, "You need to link your Telegram account through cofr.cash Settings first.")
		return
	}

	// 7. Bare text → implicit add
	result := add(body, timestamp, user.ID)
	if result.Error != nil {
		log.Printf("⚠️ Error processing add command: %s", result.Error)
		sendHTML(bot, tgUserID, fmt.Sprintf("⚠️ %s", result.UserError))
		return
	}
	log.Printf("✅ Processed command: %+v", result)
	sendSuccessWithUndo(bot, tgUserID, result)
}

// handleSlashCommand strips the / prefix and routes to the appropriate handler.
func handleSlashCommand(bot *telegramClient.BotAPI, chatID int64, body string, timestamp time.Time) {
	// Strip the slash and any @botname suffix
	cmd := strings.TrimPrefix(body, "/")
	if atIdx := strings.Index(cmd, "@"); atIdx != -1 {
		cmd = cmd[:atIdx]
	}

	// Validate message length
	if !validateMessage(body) {
		sendHTML(bot, chatID, "Message cannot be empty or exceed 500 characters.")
		return
	}

	// Verify user is registered
	user, err := r.UserRepo().GetByTelegramID(chatID)
	if err != nil {
		log.Printf("⚠️ Unregistered user attempted access: %d", chatID)
		sendHTML(bot, chatID, "You need to link your Telegram account through cofr.cash Settings first.")
		return
	}

	fields := strings.Fields(cmd)
	if len(fields) == 0 {
		return
	}

	command := fields[0]

	switch command {
	case "add", "a":
		// If no args, start guided flow
		if len(fields) == 1 {
			startGuidedAdd(bot, chatID, user.ID)
			return
		}
		result := add(strings.Join(fields[1:], " "), timestamp, user.ID)
		if result.Error != nil {
			sendHTML(bot, chatID, fmt.Sprintf("⚠️ %s", result.UserError))
			return
		}
		sendSuccessWithUndo(bot, chatID, result)

	case "remove", "rm", "r", "delete", "del", "d":
		if len(fields) == 1 {
			startRemoveFlow(bot, chatID, user.ID)
			return
		}
		result := remove(fields[1:], user.ID)
		if result.Error != nil {
			sendHTML(bot, chatID, fmt.Sprintf("⚠️ %s", result.UserError))
			return
		}
		sendSuccessMessage(bot, chatID, result)

	case "list", "ls", "l":
		result := list(fields, timestamp, user.ID)
		if result.Error != nil {
			sendHTML(bot, chatID, fmt.Sprintf("⚠️ %s", result.UserError))
			return
		}
		sendSuccessMessage(bot, chatID, result)

	case "summary", "s":
		from, to := currentMonthRange(timestamp)
		text, _, err := summaryForMonth(user.ID, from, to)
		if err != nil {
			sendHTML(bot, chatID, "Failed to generate summary.")
			return
		}
		kb := buildSummaryKeyboard()
		sendHTMLWithKeyboard(bot, chatID, text, kb)

	case "transfer", "t", "xfer":
		startGuidedTransfer(bot, chatID, user.ID)

	case "edit", "e", "update", "u":
		startEditFlow(bot, chatID, user.ID)

	case "help", "h":
		if len(fields) == 1 {
			text := userHelp[HelpTopic{Command: Help}]
			kb := buildHelpTopicsKeyboard()
			sendHTMLWithKeyboard(bot, chatID, text, kb)
			return
		}
		result := help(fields, user.ID)
		if result.Error != nil {
			sendHTML(bot, chatID, fmt.Sprintf("⚠️ %s", result.UserError))
			return
		}
		sendSuccessMessage(bot, chatID, result)

	case "config", "c", "cfg":
		if len(fields) < 2 {
			sendHTML(bot, chatID, userErrors[Configuration])
			return
		}
		result := config(fields[1:], user.ID)
		if result.Error != nil {
			sendHTML(bot, chatID, fmt.Sprintf("⚠️ %s", result.UserError))
			return
		}
		sendSuccessMessage(bot, chatID, result)

	default:
		sendHTML(bot, chatID, "Unknown command. Use /help for available commands.")
	}
}

// handleSessionInput routes text input to the appropriate session step handler.
func handleSessionInput(bot *telegramClient.BotAPI, chatID int64, text string, session *FlowSession) {
	switch session.Step {
	case StepEnterAmount:
		amount, err := stringToFloat(strings.TrimSpace(text))
		if err != nil || amount <= 0 {
			sendHTML(bot, chatID, "Please enter a valid amount (e.g. 45 or 12.50):")
			return
		}
		session.Amount = amount
		session.Step = StepConfirm
		Sessions.Set(chatID, session)
		showAddConfirmation(bot, chatID, session.MessageID, session)

	case StepEnterNotes:
		session.Notes = text
		session.Step = StepConfirm
		Sessions.Set(chatID, session)
		showAddConfirmation(bot, chatID, session.MessageID, session)

	case StepEditAmount:
		amount, err := stringToFloat(strings.TrimSpace(text))
		if err != nil || amount <= 0 {
			sendHTML(bot, chatID, "Please enter a valid amount:")
			return
		}
		session.Amount = amount
		session.Step = StepEditField
		Sessions.Set(chatID, session)
		showEditDetails(bot, chatID, session.MessageID, session)

	case StepEditNotes:
		if text == "-" {
			session.Notes = ""
		} else {
			session.Notes = text
		}
		session.Step = StepEditField
		Sessions.Set(chatID, session)
		showEditDetails(bot, chatID, session.MessageID, session)

	case StepEditCategory:
		sendHTML(bot, chatID, "Please tap a category from the buttons above.")

	case StepTransferAmount:
		amount, err := stringToFloat(strings.TrimSpace(text))
		if err != nil || amount <= 0 {
			sendHTML(bot, chatID, "Please enter a valid amount (e.g. 300 or 12.50):")
			return
		}
		session.Amount = amount
		session.Step = StepTransferConfirm
		Sessions.Set(chatID, session)
		showTransferConfirmation(bot, chatID, session.MessageID, session)

	case StepTransferNotes:
		session.Notes = text
		session.Step = StepTransferConfirm
		Sessions.Set(chatID, session)
		showTransferConfirmation(bot, chatID, session.MessageID, session)

	case StepSelectFromAccount, StepSelectToAccount:
		sendHTML(bot, chatID, "Please tap an account from the buttons above.")

	default:
		Sessions.Delete(chatID)
		sendHTML(bot, chatID, "Session expired. Please try again.")
	}
}

// handlePhotoMessage handles incoming photo messages for receipt attachment.
func handlePhotoMessage(bot *telegramClient.BotAPI, msg *telegramClient.Message) {
	chatID := msg.Chat.ID
	timestamp := time.Unix(int64(msg.Date), 0)

	user, err := r.UserRepo().GetByTelegramID(chatID)
	if err != nil {
		sendHTML(bot, chatID, "You need to link your Telegram account first.")
		return
	}

	// Get the highest resolution photo
	photos := msg.Photo
	fileID := photos[len(photos)-1].FileID

	// If sent with a caption matching add syntax, create transaction with receipt
	if caption := msg.Caption; caption != "" {
		result := add(caption, timestamp, user.ID)
		if result.Error != nil {
			sendHTML(bot, chatID, fmt.Sprintf("⚠️ %s", result.UserError))
			return
		}
		// Attach receipt to the created transaction(s)
		for _, tx := range result.Transactions {
			tx.ReceiptFileID = &fileID
			r.TxRepo().Update(tx)
		}
		sendSuccessWithUndo(bot, chatID, result)
		return
	}

	// If there's an active guided add session, attach the photo
	if session := Sessions.Get(chatID); session != nil && session.Flow == FlowAdd {
		session.ReceiptFileID = fileID
		Sessions.Set(chatID, session)
		sendHTML(bot, chatID, "📷 Receipt attached! Continue with your transaction.")
		return
	}

	// Standalone photo — start guided add with photo pre-attached
	u, err := r.UserRepo().GetByID(user.ID)
	if err != nil {
		sendHTML(bot, chatID, "Failed to load user data.")
		return
	}

	kb, idMap, err := buildCategoryKeyboard(user.ID)
	if err != nil {
		sendHTML(bot, chatID, "Failed to load categories.")
		return
	}

	Sessions.Set(chatID, &FlowSession{
		Flow:          FlowAdd,
		Step:          StepSelectCategory,
		UserID:        user.ID,
		Currency:      u.PreferredCurrency,
		ReceiptFileID: fileID,
		IDMap:         idMap,
	})

	sendHTMLWithKeyboard(bot, chatID, "📷 Receipt received! Select a category:", kb)
}

func handleStartCommand(bot *telegramClient.BotAPI, tgUserID int64, body string) {
	parts := strings.SplitN(body, " ", 2)

	// Plain /start with no code
	if len(parts) < 2 || strings.TrimSpace(parts[1]) == "" {
		text := "<b>Welcome to Cofr!</b>\n\n" +
			"Link your account:\n" +
			"1. Open cofr.cash → Settings\n" +
			"2. Click \"Link Telegram\""
		sendHTML(bot, tgUserID, text)
		return
	}

	code := strings.TrimSpace(parts[1])

	// Check if this Telegram ID is already linked
	existingUser, err := r.UserRepo().GetByTelegramID(tgUserID)
	if err == nil && existingUser != nil {
		sendHTML(bot, tgUserID, "Your Telegram account is already linked.")
		return
	}

	// Look up user by link code
	user, err := r.UserRepo().GetByLinkCode(code)
	if err != nil {
		log.Printf("⚠️ Invalid or expired link code: %s", code)
		sendHTML(bot, tgUserID, "Invalid or expired link code. Please generate a new one from Settings.")
		return
	}

	// Link Telegram to user
	if err := r.UserRepo().LinkTelegram(user.ID, tgUserID); err != nil {
		log.Printf("⚠️ Failed to link Telegram for user %s: %v", user.ID, err)
		sendHTML(bot, tgUserID, "Failed to link your account. Please try again.")
		return
	}

	log.Printf("✅ Linked Telegram user %d to account %s", tgUserID, user.ID)

	// Onboarding message
	text := "<b>Account linked!</b>\n\n" +
		"Just type an expense to get started:\n" +
		"<code>G 45 lunch</code>\n\n" +
		"G = Groceries, 45 = amount in your default currency."

	kb := telegramClient.NewInlineKeyboardMarkup(
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("My Categories", "hlp:categories"),
			telegramClient.NewInlineKeyboardButtonData("Set Currency", "hlp:config"),
			telegramClient.NewInlineKeyboardButtonData("Full Guide", "hlp:add"),
		),
	)

	sendHTMLWithKeyboard(bot, tgUserID, text, kb)
}

// sendSuccessMessage sends a formatted HTML success message.
func sendSuccessMessage(bot *telegramClient.BotAPI, chatID int64, result CommandResult) {
	text := generateSuccessMessage(result)
	sendHTML(bot, chatID, text)
}

// sendSuccessWithUndo sends a success message with an Undo button for add commands.
func sendSuccessWithUndo(bot *telegramClient.BotAPI, chatID int64, result CommandResult) {
	if result.Command == Add && len(result.Transactions) == 1 {
		tx := result.Transactions[0]
		text := formatHTMLReceipt(Add, tx)
		kb := buildUndoKeyboard(tx.ID)
		sendHTMLWithKeyboard(bot, chatID, text, kb)
		return
	}
	text := generateSuccessMessage(result)
	sendHTML(bot, chatID, text)
}
