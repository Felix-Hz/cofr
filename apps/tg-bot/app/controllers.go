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
	 * Handle /start command (deep-link Telegram linking).
	 */
	if strings.HasPrefix(body, "/start") {
		handleStartCommand(bot, tgUserID, body)
		return
	}

	/**
	 * Validate the message: non-empty and within length limits (160 chars).
	 */
	if !validateMessage(body) {
		bot.Send(telegramClient.NewMessage(tgUserID, "⚠️ Message cannot be empty or exceed 160 characters."))
		return
	}

	/**
	 * Verify user is registered through the platform.
	 */
	user, err := r.UserRepo().GetByTelegramID(tgUserID)
	if err != nil {
		log.Printf("⚠️ Unregistered user attempted access: %d", tgUserID)
		bot.Send(telegramClient.NewMessage(tgUserID, "⚠️ You need to link your Telegram account through the platform before using this bot."))
		return
	}

	/**
	 * If it has a command, dispatch it accordingly.
	 */
	if cmd, ok := strings.CutPrefix(body, "!"); ok {
		result := dispatch(cmd, timestamp, user.ID)
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
		bot.Send(telegramClient.NewMessage(tgUserID, fmt.Sprintf("⚠️ Failed to process command: \n%s", result.UserError)))
		return
	}
	log.Printf("✅ Processed command: %+v", result)
	bot.Send(telegramClient.NewMessage(tgUserID, generateSuccessMessage(result)))
}

func handleStartCommand(bot *telegramClient.BotAPI, tgUserID int64, body string) {
	parts := strings.SplitN(body, " ", 2)

	// Plain /start with no code
	if len(parts) < 2 || strings.TrimSpace(parts[1]) == "" {
		bot.Send(telegramClient.NewMessage(tgUserID,
			"Welcome to Cofr! To link your account, use the 'Link Telegram' button in Settings on the web app."))
		return
	}

	code := strings.TrimSpace(parts[1])

	// Check if this Telegram ID is already linked
	existingUser, err := r.UserRepo().GetByTelegramID(tgUserID)
	if err == nil && existingUser != nil {
		bot.Send(telegramClient.NewMessage(tgUserID, "Your Telegram account is already linked."))
		return
	}

	// Look up user by link code
	user, err := r.UserRepo().GetByLinkCode(code)
	if err != nil {
		log.Printf("⚠️ Invalid or expired link code: %s", code)
		bot.Send(telegramClient.NewMessage(tgUserID, "⚠️ Invalid or expired link code. Please generate a new one from Settings."))
		return
	}

	// Link Telegram to user
	if err := r.UserRepo().LinkTelegram(user.ID, tgUserID); err != nil {
		log.Printf("⚠️ Failed to link Telegram for user %s: %v", user.ID, err)
		bot.Send(telegramClient.NewMessage(tgUserID, "⚠️ Failed to link your account. Please try again."))
		return
	}

	log.Printf("✅ Linked Telegram user %d to account %s", tgUserID, user.ID)
	bot.Send(telegramClient.NewMessage(tgUserID, "✅ Your Telegram account has been linked! You can now track expenses here."))
}
