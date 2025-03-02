package app

import (
	"fmt"
	"strconv"
	"strings"
)

// Validate if the message is valid
func validateMessage(message string) bool {
	if message == "" || len(message) > 160 {
		return false
	}
	return true
}

// Parse the incoming message into category, amount, and optional notes
func parseMessage(msg string) (string, float64, string, error) {
	parts := strings.Fields(msg) // Split by spaces
	if len(parts) < 2 {
		return "", 0, "", fmt.Errorf("invalid message format")
	}

	category := parts[0]
	amount, err := strconv.ParseFloat(parts[1], 64)
	if err != nil {
		return "", 0, "", fmt.Errorf("invalid amount")
	}

	notes := ""
	if len(parts) > 2 {
		notes = strings.Join(parts[2:], " ") // Join remaining words as notes
	}
	return category, amount, notes, nil
}
