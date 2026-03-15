package app

import (
	"fmt"

	"remind0/db"
	r "remind0/repository"

	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/uuid"
)

// buildCategoryKeyboard builds a 3-column inline keyboard of the user's active categories.
// Returns the keyboard and an ID map for short references in callback data.
func buildCategoryKeyboard(userID uuid.UUID) (telegramClient.InlineKeyboardMarkup, map[string]uuid.UUID, error) {
	cats, err := r.CategoryRepo().GetForUser(userID)
	if err != nil {
		return telegramClient.InlineKeyboardMarkup{}, nil, err
	}

	idMap := make(map[string]uuid.UUID)
	var rows [][]telegramClient.InlineKeyboardButton
	var row []telegramClient.InlineKeyboardButton

	for i, cat := range cats {
		shortID := fmt.Sprintf("%d", i)
		idMap[shortID] = cat.ID

		label := cat.Name
		if cat.Icon != nil && *cat.Icon != "" {
			label = *cat.Icon + " " + cat.Name
		} else if cat.Alias != nil && *cat.Alias != "" {
			label = *cat.Alias + " " + cat.Name
		}

		row = append(row, telegramClient.NewInlineKeyboardButtonData(label, "cat:"+shortID))

		if len(row) == 3 || i == len(cats)-1 {
			rows = append(rows, row)
			row = nil
		}
	}

	rows = append(rows, []telegramClient.InlineKeyboardButton{
		telegramClient.NewInlineKeyboardButtonData("Cancel", "cnl:"),
	})

	return telegramClient.NewInlineKeyboardMarkup(rows...), idMap, nil
}

// buildCurrencyKeyboard builds a currency picker with the user's preferred currency first.
func buildCurrencyKeyboard(preferred string) telegramClient.InlineKeyboardMarkup {
	// Common currencies to show (preferred first, then top currencies)
	common := []string{"NZD", "USD", "EUR", "GBP", "AUD", "CAD", "JPY", "CHF"}

	// Deduplicate: ensure preferred is first
	seen := map[string]bool{preferred: true}
	ordered := []string{preferred}
	for _, c := range common {
		if !seen[c] {
			seen[c] = true
			ordered = append(ordered, c)
		}
	}

	var rows [][]telegramClient.InlineKeyboardButton
	var row []telegramClient.InlineKeyboardButton

	for i, code := range ordered {
		row = append(row, telegramClient.NewInlineKeyboardButtonData(code, "cur:"+code))
		if len(row) == 4 || i == len(ordered)-1 {
			rows = append(rows, row)
			row = nil
		}
	}

	rows = append(rows, []telegramClient.InlineKeyboardButton{
		telegramClient.NewInlineKeyboardButtonData("Cancel", "cnl:"),
	})

	return telegramClient.NewInlineKeyboardMarkup(rows...)
}

// buildConfirmKeyboard builds the confirmation keyboard for a guided add flow.
func buildConfirmKeyboard(isOpeningBalance bool) telegramClient.InlineKeyboardMarkup {
	obLabel := "OB: Off"
	if isOpeningBalance {
		obLabel = "OB: On"
	}
	return telegramClient.NewInlineKeyboardMarkup(
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Confirm", "cfm:"),
			telegramClient.NewInlineKeyboardButtonData("Currency", "cur:pick"),
			telegramClient.NewInlineKeyboardButtonData("Notes", "note:"),
		),
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData(obLabel, "ob:toggle"),
			telegramClient.NewInlineKeyboardButtonData("Cancel", "cnl:"),
		),
	)
}

// buildUndoKeyboard builds a single Undo button for after a successful add.
func buildUndoKeyboard(txID uuid.UUID) telegramClient.InlineKeyboardMarkup {
	return telegramClient.NewInlineKeyboardMarkup(
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Undo", "undo:"+txID.String()),
		),
	)
}

// buildDeleteConfirmKeyboard builds a confirmation keyboard for delete.
func buildDeleteConfirmKeyboard(txID uuid.UUID) telegramClient.InlineKeyboardMarkup {
	return telegramClient.NewInlineKeyboardMarkup(
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Yes, delete", "del:"+txID.String()),
			telegramClient.NewInlineKeyboardButtonData("Cancel", "cnl:"),
		),
	)
}

// buildSummaryKeyboard builds navigation buttons for the summary view.
func buildSummaryKeyboard() telegramClient.InlineKeyboardMarkup {
	return telegramClient.NewInlineKeyboardMarkup(
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Full Breakdown", "sum:full"),
			telegramClient.NewInlineKeyboardButtonData("Last Month", "sum:prev"),
		),
	)
}

// buildEditTransactionKeyboard builds a picker for recent transactions.
func buildEditTransactionKeyboard(txs []*db.Transaction) (telegramClient.InlineKeyboardMarkup, map[string]uuid.UUID) {
	idMap := make(map[string]uuid.UUID)
	var rows [][]telegramClient.InlineKeyboardButton

	for i, tx := range txs {
		shortID := fmt.Sprintf("%d", i)
		idMap[shortID] = tx.ID

		catName := "Transfer"
		if tx.CategoryRel != nil {
			catName = tx.CategoryRel.Name
			if catName == "" {
				catName = "?"
			}
		}

		notes := tx.Notes
		if len(notes) > 15 {
			notes = notes[:15] + "..."
		}

		label := fmt.Sprintf("%s %.2f %s", catName, tx.Amount, tx.Currency)
		if notes != "" {
			label += " " + notes
		}
		// Telegram callback button text max ~64 chars display
		if len(label) > 50 {
			label = label[:50] + "..."
		}

		rows = append(rows, telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData(label, "edt:"+shortID),
		))
	}

	rows = append(rows, telegramClient.NewInlineKeyboardRow(
		telegramClient.NewInlineKeyboardButtonData("Cancel", "cnl:"),
	))

	return telegramClient.NewInlineKeyboardMarkup(rows...), idMap
}

// buildEditFieldKeyboard builds the field selection keyboard for editing a transaction.
func buildEditFieldKeyboard() telegramClient.InlineKeyboardMarkup {
	return telegramClient.NewInlineKeyboardMarkup(
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Amount", "edf:amount"),
			telegramClient.NewInlineKeyboardButtonData("Category", "edf:category"),
		),
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Currency", "edf:currency"),
			telegramClient.NewInlineKeyboardButtonData("Notes", "edf:notes"),
		),
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Save", "edf:save"),
			telegramClient.NewInlineKeyboardButtonData("Cancel", "cnl:"),
		),
	)
}

// buildAccountKeyboard builds an inline keyboard of the user's accounts.
func buildAccountKeyboard(userID uuid.UUID, exclude uuid.UUID) (telegramClient.InlineKeyboardMarkup, map[string]uuid.UUID, error) {
	accounts, err := r.AccountRepo().GetByUser(userID)
	if err != nil {
		return telegramClient.InlineKeyboardMarkup{}, nil, err
	}

	idMap := make(map[string]uuid.UUID)
	var rows [][]telegramClient.InlineKeyboardButton
	var row []telegramClient.InlineKeyboardButton

	idx := 0
	for _, acct := range accounts {
		if acct.ID == exclude {
			continue
		}
		shortID := fmt.Sprintf("%d", idx)
		idMap[shortID] = acct.ID
		idx++

		row = append(row, telegramClient.NewInlineKeyboardButtonData(acct.Name, "acct:"+shortID))

		if len(row) == 3 || idx == len(accounts) {
			rows = append(rows, row)
			row = nil
		}
	}

	// Flush remaining buttons
	if len(row) > 0 {
		rows = append(rows, row)
	}

	rows = append(rows, []telegramClient.InlineKeyboardButton{
		telegramClient.NewInlineKeyboardButtonData("Cancel", "cnl:"),
	})

	return telegramClient.NewInlineKeyboardMarkup(rows...), idMap, nil
}

// buildTransferConfirmKeyboard builds the confirmation keyboard for a transfer flow.
func buildTransferConfirmKeyboard() telegramClient.InlineKeyboardMarkup {
	return telegramClient.NewInlineKeyboardMarkup(
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Confirm", "tcfm:"),
			telegramClient.NewInlineKeyboardButtonData("Currency", "tcur:pick"),
			telegramClient.NewInlineKeyboardButtonData("Notes", "tnote:"),
		),
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Cancel", "cnl:"),
		),
	)
}

// buildHelpTopicsKeyboard builds the interactive help topic picker.
func buildHelpTopicsKeyboard() telegramClient.InlineKeyboardMarkup {
	return telegramClient.NewInlineKeyboardMarkup(
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Add", "hlp:add"),
			telegramClient.NewInlineKeyboardButtonData("List", "hlp:list"),
			telegramClient.NewInlineKeyboardButtonData("Remove", "hlp:remove"),
		),
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Summary", "hlp:summary"),
			telegramClient.NewInlineKeyboardButtonData("Edit", "hlp:edit"),
			telegramClient.NewInlineKeyboardButtonData("Config", "hlp:config"),
		),
		telegramClient.NewInlineKeyboardRow(
			telegramClient.NewInlineKeyboardButtonData("Categories", "hlp:categories"),
			telegramClient.NewInlineKeyboardButtonData("Currencies", "hlp:currencies"),
		),
	)
}
