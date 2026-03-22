package main

import (
	"log"
	"os"
	. "remind0/app"
	DB "remind0/db"
	r "remind0/repository"
	"time"

	"github.com/getsentry/sentry-go"
	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

func main() {

	// Provision application env vars.
	config, err := LoadConfig()
	if err != nil {
		log.Panicf("⚠️ Configuration loading error: %v", err)
	}

	// Initialize Sentry (production only).
	if os.Getenv("ENV") == "production" && config.SentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              config.SentryDSN,
			Environment:      "production",
			TracesSampleRate: 0.02,
			SampleRate:       1.0,
			EnableTracing:    true,
		}); err != nil {
			log.Printf("⚠️ Sentry init failed: %v", err)
		}
		defer sentry.Flush(2 * time.Second)
	}

	// Initialize database connection and run migrations.
	db, err := DB.InitialiseDB(config.DatabaseURL)
	if err != nil {
		log.Panicf("⚠️ Database initialization error: %v", err)
	}

	// Start-up all repositories, yeehaw!
	r.InitRepositories(db)

	// Initialize session manager for guided flows.
	Sessions = NewSessionManager()

	// Setup tg bot instance.
	bot, err := telegramClient.NewBotAPI(config.TelegramToken)
	if err != nil {
		log.Panicf("⚠️ Telegram bot initialization error: %v", err)
	}

	// Well... what it says.
	bot.Debug = true

	// Register bot commands menu in Telegram UI.
	RegisterCommands(bot)

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

				func() {
					defer func() {
						if r := recover(); r != nil {
							sentry.CurrentHub().Recover(r)
							sentry.Flush(2 * time.Second)
							log.Printf("⚠️ Recovered from panic: %v", r)
						}
					}()

					if update.CallbackQuery != nil {
						HandleCallbackQuery(bot, update.CallbackQuery)
					} else if update.Message != nil {
						HandleTelegramMessage(bot, update)
					}
				}()
			}
		}

		log.Println("⚠️ Channel closed. Reconnecting...")
	}
}
