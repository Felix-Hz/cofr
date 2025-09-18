package app

import (
	"fmt"
	"log"
	"time"

	"remind0/db"

	tgClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

/**
 * Get updates using long-polling.
 * This will return a channel for updates.
 * Updates will be polled every 60 seconds.
 */
func ConnectBot(bot *tgClient.BotAPI, offset db.Offset) tgClient.UpdatesChannel {
	log.Println("> Channel opened. Connecting...")
	u := tgClient.NewUpdate(offset.Offset)
	u.Timeout = 60
	return bot.GetUpdatesChan(u)
}

func HandleTelegramMessage(bot *tgClient.BotAPI, update tgClient.Update) {

	userId := update.Message.Chat.ID           // Get Telegram user ID
	body := update.Message.Text                // Extract message text
	timestamp := update.Message.Date           // Extract timestamp
	username := update.Message.From.UserName   // Extract username
	firstName := update.Message.From.FirstName // Extract first name
	lastName := update.Message.From.LastName   // Extract last name

	/**
	 * Validate the message: non-empty and within length limits (160 chars).
	 */
	if !validateMessage(body) {
		bot.Send(tgClient.NewMessage(userId, "<!> Message cannot be empty or exceed 160 characters."))
		return
	}

	/**
	 * Process incoming message.
	 */
	category, amount, notes, parseErr := parseMessage(body)
	if parseErr != nil {
		log.Println("<!> Error parsing message:", parseErr)
		bot.Send(tgClient.NewMessage(userId, formatErrorMessage()))
		return
	}

	/**
	 * Validate or create user.
	 */
	var user db.User
	result := db.DBClient.Where("user_id = ?", userId).First(&user)
	if result.Error != nil {
		user = db.User{Username: username, UserID: userId, FirstName: firstName, LastName: lastName}
		db.DBClient.Create(&user)
	}

	/**
	 * Write message hash to prevent duplicates.
	 */
	convertedTimestamp := time.Unix(int64(timestamp), 0)
	hash := generateMessageHash(body, convertedTimestamp)

	/**
	 * Validate transaction uniqueness.
	 */
	var existingExpense db.Transaction
	result = db.DBClient.Where("hash = ?", hash).First(&existingExpense)
	if result.Error == nil {
		message := fmt.Sprintf("<!> This expense was already recorded. %s - $%.2f", existingExpense.Category, existingExpense.Amount)
		bot.Send(tgClient.NewMessage(userId, message))
		return
	}

	/**
	 * Persist transaction
	 */
	expense := db.Transaction{
		UserID:    user.ID,
		Category:  category,
		Amount:    amount,
		Notes:     notes,
		Timestamp: convertedTimestamp,
		Hash:      hash,
	}
	db.DBClient.Create(&expense)

	/**
	 * Send confirmation message to user.
	 */
	bot.Send(tgClient.NewMessage(userId, fmt.Sprintf(
		"✅ Expense Recorded\n"+
			"══════════════════════\n"+
			"📝 Category  │ %s\n"+
			"💰 Amount    │ $%.2f\n"+
			"📌 Notes     │ %s\n"+
			"🕒 Timestamp │ %s\n"+
			"══════════════════════",
		category, amount, notes, convertedTimestamp.Format("02-Jan-2006 15:04:05"),
	)))
}
