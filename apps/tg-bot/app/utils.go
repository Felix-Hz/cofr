package app

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"
)

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

func validateMessage(message string) bool {
	if message == "" || len(message) > 160 {
		return false
	}
	return true
}

func generateMessageHash(msg string, timestamp time.Time) string {
	hash := sha256.New()

	hash.Write([]byte(msg))
	hash.Write([]byte(fmt.Sprintf("%d", timestamp.Unix())))

	hashBytes := hash.Sum(nil)
	return hex.EncodeToString(hashBytes)
}

func parseMessage(msg string) (string, float64, string, error) {

	/**
	 * Split the message into parts divided by spaces,
	 * and ensure it has at least a category and amount.
	 */
	parts := strings.Fields(msg)
	if len(parts) < 2 {
		return "", 0, "", fmt.Errorf("⚠️ Invalid message format")
	}

	category := parts[0]

	/**
	 * Check if the category is a valid alias and convert it to the full category name.
	 */
	if categoryName, exists := findCategory(category); exists {
		category = categoryName
	} else {
		return "", 0, "", fmt.Errorf("⚠️ Invalid category alias")
	}

	/**
	 * Parse the transaction amount and ensure it's a valid float.
	 */
	amount, err := strconv.ParseFloat(parts[1], 64)
	if err != nil {
		return "", 0, "", fmt.Errorf("⚠️ Invalid amount")
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

/**
 * Format a return message to inform the user of the correct format.
 */
func formatErrorMessage() string {
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
			"• I 90 Salary\n\n"+
			"✅ Valid Categories:\n"+
			"%s"+
			"════════════\n",
		categoryList,
	)
}
