package app

import (
	"fmt"
	"log"
	. "remind0/db"
	"strconv"
	"strings"
	"time"
)

type Command string

const (
	Add     Command = "add"
	Remove  Command = "rm"
	Unknown Command = "unknown"
	List    Command = "ls"
	Help    Command = "h"
	Edit    Command = "e"
)

type CommandResult struct {
	Error       error
	UserError   string
	Command     Command
	Transaction *Transaction // Optional as not all commands return a transaction.
}

/**
 * User-friendly error messages.
 */
var userErrors = map[Command]string{
	Add: addMessageError(),

	Remove:  "Please use the format: !rm <transaction_id>",
	Unknown: "Something went wrong, please try again later.",
	List:    "Listing transactions is not implemented yet.",
	Help:    "Help command is not implemented yet.",
	Edit:    "Editing transactions is not implemented yet.",
}

/**
 * Dispatcher that handles incoming commands from the user.
 */
func dispatch(msg string, timestamp time.Time, userId uint) CommandResult {
	switch content := strings.Fields(msg); content[0] {
	case "add", "a", "$", "+":
		return add(strings.Join(content[1:], ""), timestamp, userId)
	case "remove", "rm", "r", "delete", "del", "d":
		return remove(strings.Join(content[1:], ""), userId)
	case "list", "ls", "l":
		return CommandResult{Command: List, Error: fmt.Errorf("list not implemented"), UserError: userErrors[List]}
	case "help", "h":
		return CommandResult{Command: Help, Error: fmt.Errorf("help not implemented"), UserError: userErrors[Help]}
	case "edit", "e", "update", "u":
		return CommandResult{Command: Edit, Error: fmt.Errorf("edit not implemented"), UserError: userErrors[Edit]}
	default:
		return CommandResult{Command: Unknown, Error: fmt.Errorf("%s not implemented", content[0]), UserError: userErrors[Unknown]}
	}
}

func remove(strId string, userId uint) CommandResult {
	// Define the command type for context
	cmd := Remove

	/**
	 * Validate and convert txId to int64
	 */
	id, err := strconv.ParseInt(strId, 10, 64)
	if err != nil {
		return CommandResult{Command: cmd, Error: fmt.Errorf("ID must be a number"), UserError: userErrors[cmd]}
	}

	/**
	 * Verify the transaction exists
	 */
	var tx Transaction
	result := DBClient.Where("id = ? AND user_id = ?", id, userId).First(&tx)
	if result.Error != nil {
		return CommandResult{Command: cmd, Error: fmt.Errorf("ID %s not found: %s", strId, result.Error), UserError: userErrors[Unknown]}
	}

	/**
	 * Delete the transaction
	 */
	delete := DBClient.Delete(&tx)
	if delete.Error != nil || delete.RowsAffected == 0 {
		return CommandResult{Command: cmd, Error: fmt.Errorf("failed to delete ID %s: %s", strId, delete.Error), UserError: userErrors[Unknown]}
	}

	log.Printf("✅ Deleted transaction %d (user=%d)", tx.ID, userId)

	return CommandResult{Transaction: &tx, Command: cmd, Error: nil}
}

func add(body string, timestamp time.Time, userId uint) CommandResult {
	// Define the command type for context
	cmd := Add

	/**
	 * Process incoming add-request message.
	 */
	category, amount, notes, err := parseAddTx(body)
	if err != nil {
		return CommandResult{Command: cmd, Error: err, UserError: userErrors[cmd]}
	}

	/**
	 * Hash message to prevent duplicates.
	 */
	hash := generateMessageHash(body, timestamp)

	/**
	 * Validate transaction uniqueness.
	 */
	var exists Transaction
	r := DBClient.Where("hash = ?", hash).First(&exists)
	if r.Error == nil {
		return CommandResult{Command: cmd, Error: fmt.Errorf("duplicate transaction"), UserError: userErrors[Unknown]}
	}

	/**
	 * Persist transaction
	 */
	tx := Transaction{
		UserID:    userId,
		Category:  category,
		Amount:    amount,
		Notes:     notes,
		Timestamp: timestamp,
		Hash:      hash,
	}

	c := DBClient.Create(&tx)
	if c.Error != nil {
		return CommandResult{Command: cmd, Error: c.Error, UserError: userErrors[Unknown]}
	}

	return CommandResult{Transaction: &tx, Command: cmd, Error: nil}
}
