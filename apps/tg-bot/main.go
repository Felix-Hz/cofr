package main

import (
	"log"
	"os"

	"remind0/app"
	"remind0/db"

	tgClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	dotEnv "github.com/joho/godotenv"
)

func main() {

	// Load environment variables.
	err := dotEnv.Load()
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
	bot, err := tgClient.NewBotAPI(botToken)
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

	// Start the bot and listen for updates indefinitely.
	for {
		updates := app.ConnectBot(bot, offset)

		// Listen to updates in the range loop
		for update := range updates {

			// Only handle updates with IDs greater than the offset.
			if update.UpdateID > offset.Offset {

				// Update the offset in the database.
				offset.Offset = update.UpdateID
				db.DBClient.Save(&offset)

				// Handle the message if it's a valid update.
				if update.Message != nil {
					app.HandleTelegramMessage(bot, update)
				}
			}
		}

		log.Println("> Channel closed. Reconnecting...")
	}
}
