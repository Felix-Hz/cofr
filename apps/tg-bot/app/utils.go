package app

import (
	"strconv"
	"strings"

	"crypto/sha256"
	"encoding/hex"
	"fmt"
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
	{"$", "Savings"},
	{"U", "Utilities"},
	{"SUB", "Subscriptions"},
	{"R", "Rent"},
	{"H", "Health & Fitness"},
	{"T", "Transport"},
	{"G", "Groceries"},
	{"GO", "Going Out"},
	{"I", "Investment"},
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

/*   dP                                                    dP  oo                          */
/*   88                                                    88                              */
/* d8888P88d888b..d8888b.88d888b..d8888b..d8888b..d8888b.d8888PdP.d8888b.88d888b..d8888b.  */
/*   88  88'  `8888'  `8888'  `88Y8ooooo.88'  `8888'  `""  88  8888'  `8888'  `88Y8ooooo.  */
/*   88  88      88.  .8888    88      8888.  .8888.  ...  88  8888.  .8888    88      88  */
/*   dP  dP      `88888P8dP    dP`88888P'`88888P8`88888P'  dP  dP`88888P'dP    dP`88888P'  */
/* ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo */

/**
 * Validate and process an add transaction message.
 */
func parseAddTx(msg string) (string, float64, string, error) {

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
