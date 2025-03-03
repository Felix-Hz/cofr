package main

import (
	"log"
	"os"

	"remind0/app"
	"remind0/db"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables.
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Retrieve bot token from environment variables.
	botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
	if botToken == "" {
		log.Fatal("TELEGRAM_BOT_TOKEN is not set in .env file")
	}

	// Initialize database connection and run migrations.
	db.InitialiseDB()

	// Setup Telegram bot instance.
	bot, err := tgbotapi.NewBotAPI(botToken)
	if err != nil {
		log.Panic(err)
	}

	bot.Debug = true

	// Initialise the offset if it doesn't exist.
	var offset db.Offset
	result := db.DBClient.First(&offset)
	if result.Error != nil {
		offset = db.Offset{Offset: 0}
		db.DBClient.Create(&offset)
	}

	// Get updates using long-polling.
	// This will return a channel for updates.
	// Updates will be polled every 60 seconds.
	u := tgbotapi.NewUpdate(offset.Offset)
	u.Timeout = 60
	updates := bot.GetUpdatesChan(u)

	for update := range updates {
		if update.UpdateID > offset.Offset {
			// Update the offset in the database.
			// Store the latest offset.
			offset.Offset = update.UpdateID
			db.DBClient.Save(&offset)

			if update.Message != nil {
				app.HandleTelegramMessage(bot, update)
			}
		}
	}
}
