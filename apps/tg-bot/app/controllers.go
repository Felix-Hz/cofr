package app

import (
	"fmt"
	"log"
	"time"

	"remind0/db"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

func HandleTelegramMessage(bot *tgbotapi.BotAPI, update tgbotapi.Update) {
	from := update.Message.Chat.ID           // Get Telegram user ID
	body := update.Message.Text              // Extract message text
	username := update.Message.From.UserName // Extract username
	timestamp := update.Message.Date         // Extract timestamp

	// Validate the message
	if !validateMessage(body) {
		msg := tgbotapi.NewMessage(from, "Invalid message format.")
		bot.Send(msg)
		return
	}

	// Parse the message (Assumes parseMessage function exists)
	category, amount, notes, parseErr := parseMessage(body)
	if parseErr != nil {
		log.Println("Error parsing message:", parseErr)
		msg := tgbotapi.NewMessage(from, "Invalid format. Use: <category> <amount> <optional_notes>")
		bot.Send(msg)
		return
	}

	// Check if user exists
	var user db.User
	result := db.DBClient.Where("username = ?", username).First(&user)
	if result.Error != nil {
		user = db.User{Username: username}
		db.DBClient.Create(&user)
	}

	// Hash message to prevent duplicates.
	hash := generateMessageHash(body, time.Unix(int64(timestamp), 0))

	// Avoid duplicate expenses
	var existingExpense db.Expense
	result = db.DBClient.Where("hash = ?", hash).First(&existingExpense)
	if result.Error == nil {
		message := fmt.Sprintf("This expense was already recorded. %s - $%.2f", existingExpense.Category, existingExpense.Amount)
		msg := tgbotapi.NewMessage(from, message)
		bot.Send(msg)
		return
	}

	// Store the expense
	expense := db.Expense{
		UserID:   user.ID,
		Category: category,
		Amount:   amount,
		Notes:    notes,
		Hash:     hash,
	}
	db.DBClient.Create(&expense)

	// Return confirmation message
	msg := tgbotapi.NewMessage(from, fmt.Sprintf("Expense recorded: %s - $%.2f", category, amount))
	bot.Send(msg)
}
