package app

import (
	"fmt"
	"log"
	"time"

	. "remind0/db"

	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

/**
 * Get updates using long-polling.
 * This will return a channel for updates.
 * Updates will be polled every 60 seconds.
 */
func ConnectBot(bot *telegramClient.BotAPI, offset Offset) telegramClient.UpdatesChannel {
	log.Println("> Channel opened. Connecting...")
	u := telegramClient.NewUpdate(offset.Offset)
	u.Timeout = 60
	return bot.GetUpdatesChan(u)
}

func HandleTelegramMessage(bot *telegramClient.BotAPI, update telegramClient.Update) {

	userId := update.Message.Chat.ID           // Get Telegram user ID
	body := update.Message.Text                // Extract message text
	timestamp := update.Message.Date           // Extract timestamp
	username := update.Message.From.UserName   // Extract username
	firstName := update.Message.From.FirstName // Extract first name
	lastName := update.Message.From.LastName   // Extract last name

	log.Printf("> Received message: %+v", struct {
		User      string
		Body      string
		Timestamp time.Time
	}{
		Body:      body,
		Timestamp: time.Unix(int64(timestamp), 0),
		User:      firstName + " " + lastName,
	})

	/**
	 * Validate the message: non-empty and within length limits (160 chars).
	 */
	if !validateMessage(body) {
		bot.Send(telegramClient.NewMessage(userId, "<!> Message cannot be empty or exceed 160 characters."))
		return
	}

	/**
	 * Process incoming message.
	 */
	category, amount, notes, parseErr := parseMessage(body)
	if parseErr != nil {
		log.Println("<!> Error parsing message:", parseErr)
		bot.Send(telegramClient.NewMessage(userId, formatErrorMessage()))
		return
	}

	/**
	 * Validate or create user.
	 */
	var user User
	result := DBClient.Where("user_id = ?", userId).First(&user)
	if result.Error != nil {
		user = User{Username: username, UserID: userId, FirstName: firstName, LastName: lastName}
		DBClient.Create(&user)
	}

	/**
	 * Write message hash to prevent duplicates.
	 */
	convertedTimestamp := time.Unix(int64(timestamp), 0)
	hash := generateMessageHash(body, convertedTimestamp)

	/**
	 * Validate transaction uniqueness.
	 */
	var existingExpense Transaction
	result = DBClient.Where("hash = ?", hash).First(&existingExpense)
	if result.Error == nil {
		message := fmt.Sprintf("<!> This expense was already recorded. %s - $%.2f", existingExpense.Category, existingExpense.Amount)
		bot.Send(telegramClient.NewMessage(userId, message))
		return
	}

	/**
	 * Persist transaction
	 */
	expense := Transaction{
		UserID:    user.ID,
		Category:  category,
		Amount:    amount,
		Notes:     notes,
		Timestamp: convertedTimestamp,
		Hash:      hash,
	}
	DBClient.Create(&expense)

	/**
	 * Send confirmation message to user.
	 */
	bot.Send(telegramClient.NewMessage(userId, fmt.Sprintf(
		"✅ Expense Recorded\n"+
			"══════════════════════\n"+
			"📝 Category  │ %s\n"+
			"💰 Amount    │ $%.2f\n"+
			"📌 Notes     │ %s\n"+
			"🕒 Timestamp │ %s\n"+
			"══════════════════════",
		category, amount, notes, convertedTimestamp.Format("02-Jan-2006 15:04:05"),
	)))

	log.Printf("> Expense recorded: %s - $%.2f", category, amount)
}
