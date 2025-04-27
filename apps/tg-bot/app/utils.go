package app

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Validate if the message is valid.
func validateMessage(message string) bool {
	if message == "" || len(message) > 160 {
		return false
	}
	return true
}

// Generate a unique hash based on the message and timestamp.
func generateMessageHash(msg string, timestamp time.Time) string {
	hash := sha256.New()

	// Combine message content with the timestamp.
	hash.Write([]byte(msg))
	hash.Write([]byte(fmt.Sprintf("%d", timestamp.Unix())))

	hashBytes := hash.Sum(nil)
	return hex.EncodeToString(hashBytes)
}

var categoryAliases = map[string]string{
	"H":   "Housing",
	"T":   "Transportation",
	"G":   "Groceries",
	"GO":  "Going Out",
	"HM":  "Health & Medical",
	"IS":  "Insurance",
	"I" :  "Income",
	"PC":  "Personal Care",
	"E":   "Entertainment",
	"S":   "Savings",
	"INV": "Investments",
	"EDU": "Education",
	"TR":  "Trips",
	"M":   "Miscellaneous",
}

// Parse the incoming message into category, amount, and optional notes
func parseMessage(msg string) (string, float64, string, error) {
	parts := strings.Fields(msg) // Split by spaces
	if len(parts) < 2 {
		return "", 0, "", fmt.Errorf("invalid message format")
	}

	// Category must be a key of the hashmap.
	category := parts[0]

	// Check if the category is an alias and replace it with full category name
	if fullCategory, exists := categoryAliases[category]; exists {
		category = fullCategory
	} else {
		return "", 0, "", fmt.Errorf("invalid category alias")
	}

	// Parse the amount as a float64.
	amount, err := strconv.ParseFloat(parts[1], 64)
	if err != nil {
		return "", 0, "", fmt.Errorf("invalid amount")
	}

	// Everything after the amount is considered notes.
	notes := ""
	if len(parts) > 2 {
		notes = strings.Join(parts[2:], " ")
	}

	return category, amount, notes, nil
}
