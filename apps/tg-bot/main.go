package main

import (
	"log"
	. "remind0/app"
	DB "remind0/db"
	r "remind0/repository"

	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

func main() {

	// Provision application env vars.
	config, err := LoadConfig()
	if err != nil {
		log.Panicf("⚠️ Configuration loading error: %v", err)
	}

	// Initialize database connection and run migrations.
	db, err := DB.InitialiseDB(config.TursoDSN + "?authToken=" + config.TursoAuthToken)
	if err != nil {
		log.Panicf("⚠️ Database initialization error: %v", err)
	}

	// Start-up all repositories, yeehaw!
	r.InitRepositories(db)

	// Setup tg bot instance.
	bot, err := telegramClient.NewBotAPI(config.TelegramToken)
	if err != nil {
		log.Panicf("⚠️ Telegram bot initialization error: %v", err)
	}

	// Well... what it says.
	bot.Debug = true

	// Initialise conversation's offset tracking.
	o := r.OffsetRepo()
	offset, _ := o.GetOrCreate()

	// Start the bot and listen for updates indefinitely.
	for {
		updates := ConnectBot(bot, offset)

		// Listen to new messages.
		for update := range updates {

			// Only process unhandled messages.
			if update.UpdateID > offset.Offset {

				// Update to keep track of the already processed transactions.
				o.UpdateLastSeen(offset, update.UpdateID)

				// Handle the message if it's a valid update.
				if update.Message != nil {
					HandleTelegramMessage(bot, update)
				}
			}
		}

		log.Println("⚠️ Channel closed. Reconnecting...")
	}
}
