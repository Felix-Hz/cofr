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

/**
 * Get updates using long-polling.
 * This will return a channel for updates.
 * Updates will be polled every 60 seconds.
 */
func ConnectBot(bot *telegramClient.BotAPI, offset *Offset) telegramClient.UpdatesChannel {
	u := telegramClient.NewUpdate(offset.Offset)
	u.Timeout = 60
	log.Println("✅ Channel opened")
	return bot.GetUpdatesChan(u)
}

func HandleTelegramMessage(bot *telegramClient.BotAPI, update telegramClient.Update) {

	tgUserID := update.Message.Chat.ID                    // Get Telegram user ID
	body := update.Message.Text                           // Extract message text
	timestamp := time.Unix(int64(update.Message.Date), 0) // Extract timestamp

	log.Printf("✅ Received message: %+v", struct {
		User      string
		Body      string
		Timestamp time.Time
	}{
		Body:      body,
		Timestamp: timestamp,
		User:      update.Message.From.FirstName + " " + update.Message.From.LastName,
	})

	/**
	 * Validate the message: non-empty and within length limits (160 chars).
	 */
	if !validateMessage(body) {
		bot.Send(telegramClient.NewMessage(tgUserID, "⚠️ Message cannot be empty or exceed 160 characters."))
		return
	}

	/**
	 * Validate or create user.
	 */
	user, err := r.UserRepo().GetOrCreate(tgUserID, update.Message.From)
	if err != nil {
		log.Printf("⚠️ Error getting user: %s", err)
		bot.Send(telegramClient.NewMessage(tgUserID, "⚠️ Failed to fetch or create user profile. Please try again later."))
		return
	}

	/**
	 * An exclamation mark indicates a user's wish to interact with the system.
	 */
	if strings.HasPrefix(body, "!") {
		result := dispatch(strings.TrimPrefix(body, "!"), timestamp, user.ID)
		if result.Error != nil {
			log.Printf("⚠️ Error processing command: %s", result.Error)
			bot.Send(telegramClient.NewMessage(tgUserID, fmt.Sprintf("⚠️ Failed to process command: %s", result.UserError)))
			return
		}
		log.Printf("✅ Processed command: %+v", result)
		bot.Send(telegramClient.NewMessage(tgUserID, generateSuccessMessage(result)))
		return
	}

	/**
	 * If it doesn't have a command but it's valid, treat the message as an add transaction request.
	 * This is because I like the simplicity of being able to do: $ 45
	 * Design-wise, is it crap or is it not? I don't care. Might make it a command-only later.
	 */
	result := add(body, timestamp, user.ID)
	if result.Error != nil {
		log.Printf("⚠️ Error processing add command: %s", result.Error)
		bot.Send(telegramClient.NewMessage(tgUserID, fmt.Sprintf("⚠️ Failed to process command: %s", result.UserError)))
		return
	}

	bot.Send(telegramClient.NewMessage(tgUserID, generateSuccessMessage(result)))
}
