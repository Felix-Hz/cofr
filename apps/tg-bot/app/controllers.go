package app

import (
	"fmt"
	"log"
	"time"

	"remind0/db"

	tgClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

// Get updates using long-polling.
// This will return a channel for updates.
// Updates will be polled every 60 seconds.
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

	// Validate the message
	if !validateMessage(body) {
		msg := tgClient.NewMessage(userId, "Invalid message format.")
		bot.Send(msg)
		return
	}

	// Parse the message (Assumes parseMessage function exists)
	category, amount, notes, parseErr := parseMessage(body)
	if parseErr != nil {
		log.Println("Error parsing message:", parseErr)
		msg := tgClient.NewMessage(userId, "Invalid format. Use: <category> <amount> <optional_notes>")
		bot.Send(msg)
		return
	}

	// Check if user already exists.
	var user db.User
	result := db.DBClient.Where("user_id = ?", userId).First(&user)
	if result.Error != nil {
		user = db.User{Username: username, UserID: userId, FirstName: firstName, LastName: lastName}
		db.DBClient.Create(&user)
	}

	// Hash message to prevent duplicates.
	convertedTimestamp := time.Unix(int64(timestamp), 0)
	hash := generateMessageHash(body, convertedTimestamp)

	// Avoid duplicate expenses.
	var existingExpense db.Expense
	result = db.DBClient.Where("hash = ?", hash).First(&existingExpense)
	if result.Error == nil {
		message := fmt.Sprintf("This expense was already recorded. %s - $%.2f", existingExpense.Category, existingExpense.Amount)
		msg := tgClient.NewMessage(userId, message)
		bot.Send(msg)
		return
	}

	// Store the expense
	expense := db.Expense{
		UserID:    user.ID,
		Category:  category,
		Amount:    amount,
		Notes:     notes,
		Timestamp: convertedTimestamp,
		Hash:      hash,
	}
	db.DBClient.Create(&expense)

	formattedMessage := fmt.Sprintf(
		"Expense Recorded:\n"+
			"---------------------------------\n"+
			"| Category   | %s\n"+
			"| Amount     | $%.2f\n"+
			"| Notes      | %s\n"+
			"| Timestamp  | %s\n"+
			"---------------------------------",
		category, amount, notes, convertedTimestamp.Format("02-Jan-2006 15:04:05"),
	)

	// Send the formatted message to the user
	msg := tgClient.NewMessage(userId, formattedMessage)
	bot.Send(msg)
}
