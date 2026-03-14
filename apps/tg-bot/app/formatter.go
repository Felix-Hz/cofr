package app

import (
	"strings"

	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

// sendHTML sends an HTML-formatted message to a chat.
func sendHTML(bot *telegramClient.BotAPI, chatID int64, text string) (telegramClient.Message, error) {
	msg := telegramClient.NewMessage(chatID, text)
	msg.ParseMode = "HTML"
	return bot.Send(msg)
}

// sendHTMLWithKeyboard sends an HTML-formatted message with an inline keyboard.
func sendHTMLWithKeyboard(bot *telegramClient.BotAPI, chatID int64, text string, keyboard telegramClient.InlineKeyboardMarkup) (telegramClient.Message, error) {
	msg := telegramClient.NewMessage(chatID, text)
	msg.ParseMode = "HTML"
	msg.ReplyMarkup = keyboard
	return bot.Send(msg)
}

// editHTML edits an existing message with HTML formatting.
func editHTML(bot *telegramClient.BotAPI, chatID int64, messageID int, text string, keyboard *telegramClient.InlineKeyboardMarkup) (telegramClient.Message, error) {
	edit := telegramClient.NewEditMessageText(chatID, messageID, text)
	edit.ParseMode = "HTML"
	if keyboard != nil {
		edit.ReplyMarkup = keyboard
	}
	return bot.Send(edit)
}

// escapeHTML escapes special HTML characters in user-provided text.
func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s
}
