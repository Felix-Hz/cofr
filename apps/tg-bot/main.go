package main

import (
	"log"
	. "remind0/app"
	"remind0/db"

	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

func main() {

	// Provision application env vars.
	config, err := LoadConfig()
	if err != nil {
		log.Panicf("⚠️ Configuration loading error: %v", err)
	}

	// Initialize database connection and run migrations.
	dbClient, err := db.InitialiseDB(config.TursoDSN + "?authToken=" + config.TursoAuthToken)
	if err != nil {
		log.Panicf("⚠️ Database initialization error: %v", err)
	}

	// Setup tg bot instance.
	bot, err := telegramClient.NewBotAPI(config.TelegramToken)
	if err != nil {
		log.Panicf("⚠️ Telegram bot initialization error: %v", err)
	}

	// Wel... what it says.
	bot.Debug = true

	// Initialise the offset if it doesn't exist.
	// This will help to keep track of the already processed transactions.
	var offset db.Offset
	result := dbClient.First(&offset)
	if result.Error != nil {
		offset = db.Offset{Offset: 0}
		dbClient.Create(&offset)
	}

	// Start the bot and listen for updates indefinitely.
	for {
		updates := ConnectBot(bot, offset)

		// Listen to updates in the range loop
		for update := range updates {

			// Only handle updates with IDs greater than the offset.
			if update.UpdateID > offset.Offset {

				// Update the offset in the database.
				offset.Offset = update.UpdateID
				dbClient.Save(&offset)

				// Handle the message if it's a valid update.
				if update.Message != nil {
					HandleTelegramMessage(bot, update)
				}
			}
		}

		log.Println("⚠️ Channel closed. Reconnecting...")
	}
}
