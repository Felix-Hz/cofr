package app

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	. "remind0/db"
	"strconv"
	"strings"
	"time"
)

/*                   dP                                   oo                  */
/*                   88                                                       */
/* .d8888b..d8888b.d8888P.d8888b..d8888b. .d8888b.88d888b.dP.d8888b..d8888b.  */
/* 88'  `""88'  `88  88  88ooood888'  `88 88'  `8888'  `888888ooood8Y8ooooo.  */
/* 88.  ...88.  .88  88  88.  ...88.  .88 88.  .8888      8888.  ...      88  */
/* `88888P'`88888P8  dP  `88888P'`8888P88 `88888P'dP      dP`88888P'`88888P'  */
/* ooooooooooooooooooooooooooooooo~~~~.88~ooooooooooooooooooooooooooooooooooo */
/*                                d8888P                                      */

type Category struct {
	Alias string
	Name  string
}

// TODO: Aliases should likely be a string[] to allow for multiple aliases per category.
var validCategories = []Category{
	{"+", "Income"},
	{"H", "Health"},
	{"T", "Transport"},
	{"G", "Groceries"},
	{"GO", "Going Out"},
	{"HM", "Home"},
	{"I", "Investment"},
	{"PC", "Personal Care"},
	{"E", "Entertainment"},
	{"S", "Shopping"},
	{"EDU", "Education"},
	{"TR", "Travel"},
	{"MISC", "Miscellaneous"},
}

func findCategory(code string) (string, bool) {
	for _, cat := range validCategories {
		if cat.Alias == code {
			return cat.Name, true
		}
	}
	return "", false
}

/* 88d8b.d8b..d8888b..d8888b..d8888b..d8888b..d8888b. .d8888b..d8888b.  */
/* 88'`88'`8888ooood8Y8ooooo.Y8ooooo.88'  `8888'  `88 88ooood8Y8ooooo.  */
/* 88  88  8888.  ...      88      8888.  .8888.  .88 88.  ...      88  */
/* dP  dP  dP`88888P'`88888P'`88888P'`88888P8`8888P88 `88888P'`88888P'  */
/* ooooooooooooooooooooooooooooooooooooooooooo~~~~.88~ooooooooooooooooo */
/*                                            d8888P                    */

/**
 * Validate the message length and content.
 */
func validateMessage(message string) bool {
	if message == "" || len(message) > 160 {
		return false
	}
	return true
}

/**
 * Generate a SHA-256 hash of the message combined with its timestamp.
 * This helps to uniquely identify messages and prevent duplicates.
 */
func generateMessageHash(msg string, timestamp time.Time) string {
	hash := sha256.New()

	hash.Write([]byte(msg))
	hash.Write([]byte(fmt.Sprintf("%d", timestamp.Unix())))

	hashBytes := hash.Sum(nil)
	return hex.EncodeToString(hashBytes)
}

/**
 * Format a return message to inform the user of a successful operation.
 */
func successMessage(recorded bool, id uint, category string, amount float64, notes string, timestamp time.Time) string {
	operation := "✅ Expense Recorded"
	if !recorded {
		operation = "✂️ Expense Deleted"
	}
	return fmt.Sprintf(
		"%s \n"+
			"════════════\n"+
			"🪪 ID: %d\n"+
			"📥 Category: %s\n"+
			"💰 Amount: $%.2f\n"+
			"📌 Notes: %s\n"+
			"🕒 At: %s\n"+
			"════════════",
		operation, id, category, amount, notes, timestamp.Format("02-Jan-2006 15:04"),
	)
}

/**
 * Format a return message to inform the user of the correct format.
 */
func invalidMessageError() string {
	var categoryList string
	for _, cat := range validCategories {
		categoryList += fmt.Sprintf("• %s (%s)\n", cat.Alias, cat.Name)
	}
	return fmt.Sprintf(
		"⚠️ Invalid Message Format\n"+
			"════════════\n\n"+
			"📝 Expected Format:\n"+
			"• <category> <amount> <notes?>\n\n"+
			"💡 Example:\n"+
			"• G 45 Woolworths\n"+
			"• + 90 Salary\n\n"+
			"✅ Valid Categories:\n"+
			"%s"+
			"════════════\n",
		categoryList,
	)
}

/*   dP                                                    dP  oo                          */
/*   88                                                    88                              */
/* d8888P88d888b..d8888b.88d888b..d8888b..d8888b..d8888b.d8888PdP.d8888b.88d888b..d8888b.  */
/*   88  88'  `8888'  `8888'  `88Y8ooooo.88'  `8888'  `""  88  8888'  `8888'  `88Y8ooooo.  */
/*   88  88      88.  .8888    88      8888.  .8888.  ...  88  8888.  .8888    88      88  */
/*   dP  dP      `88888P8dP    dP`88888P'`88888P8`88888P'  dP  dP`88888P'dP    dP`88888P'  */
/* ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo */

func removeTx(msg string, userId uint) (Transaction, error) {
	/**
	 * Negation command must have an ID following the exclamation mark.
	 */
	if len(msg) <= 1 {
		return Transaction{}, fmt.Errorf("must indicate transaction ID")
	}

	strId := msg[1:]

	/**
	 * Validate and convert txId to int64
	 */
	id, err := strconv.ParseInt(strId, 10, 64)
	if err != nil {
		return Transaction{}, fmt.Errorf("ID must be a number")
	}

	/**
	 * Verify the transaction exists
	 */
	var tx Transaction
	result := DBClient.Where("id = ? AND user_id = ?", id, userId).First(&tx)
	if result.Error != nil {
		return Transaction{}, fmt.Errorf("ID %s not found: %s", strId, result.Error)
	}

	/**
	 * Delete the transaction
	 */
	delete := DBClient.Delete(&tx)
	if delete.Error != nil || delete.RowsAffected == 0 {
		return Transaction{}, fmt.Errorf("failed to delete ID %s: %s", strId, delete.Error)
	}

	return tx, nil
}

/**
 * Validate and process an add transaction message.
 */
func processTx(msg string) (string, float64, string, error) {

	/**
	 * Split the message into parts divided by spaces,
	 * and ensure it has at least a category and amount.
	 */
	parts := strings.Fields(msg)
	if len(parts) < 2 {
		return "", 0, "", fmt.Errorf("invalid message format")
	}

	category := parts[0]

	/**
	 * Check if the category is a valid alias and convert it to the full category name.
	 */
	if categoryName, exists := findCategory(category); exists {
		category = categoryName
	} else {
		return "", 0, "", fmt.Errorf("invalid category alias")
	}

	/**
	 * Parse the transaction amount and ensure it's a valid float.
	 */
	amount, err := strconv.ParseFloat(strings.ReplaceAll(parts[1], ",", "."), 64)
	if err != nil {
		return "", 0, "", fmt.Errorf("invalid amount")
	}

	/**
	 * Extract transaction notes if they exist.
	 */
	notes := ""
	if len(parts) > 2 {
		notes = strings.Join(parts[2:], " ")
	}

	return category, amount, notes, nil
}
