package app

import (
	"fmt"
	. "remind0/db"
	repo "remind0/repository"
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
	Error        error
	UserError    string
	Command      Command
	Transactions []*Transaction // Optional as not all commands return a transaction.
}

/**
 * User-friendly error messages.
 */
var userErrors = map[Command]string{
	Add: addMessageError(),

	Remove:  "Please use the format: !rm <required IDs separated by space>",
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
		return remove(content[1:], userId)
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

func remove(strIds []string, userId uint) CommandResult {
	// Define the command type for context
	cmd := Remove
	r := repo.TxRepo()

	// Slice to hold validated IDs to delete
	ids := []int64{}

	/**
	 * Validate and convert txId to int64
	 */
	for _, strId := range strIds {
		id, err := strconv.ParseInt(strId, 10, 64)
		if err != nil {
			return CommandResult{Command: cmd, Error: fmt.Errorf("ID must be a number"), UserError: userErrors[cmd]}
		}
		ids = append(ids, id)
	}

	/**
	 * Verify the transaction exists
	 */
	txs, err := r.GetManyById(ids, userId)
	if err != nil {
		return CommandResult{Command: cmd, Error: fmt.Errorf("IDs %v not found: %s", ids, err), UserError: userErrors[Unknown]}
	}

	/**
	 * Delete the transaction
	 */
	if err := r.BatchDelete(txs); err != nil {
		return CommandResult{Command: cmd, Error: fmt.Errorf("failed to delete IDs %v: %s", ids, err), UserError: userErrors[Unknown]}
	}

	return CommandResult{Transactions: txs, Command: cmd, Error: nil}
}

func add(body string, timestamp time.Time, userId uint) CommandResult {
	// Define the command type for context
	cmd := Add
	r := repo.TxRepo()

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
	_tx, err := r.GetByHash(hash, userId)
	if _tx != nil && err == nil {
		return CommandResult{Command: cmd, Error: fmt.Errorf("duplicate transaction"), UserError: userErrors[Unknown]}
	}

	/**
	 * Persist transaction
	 */
	tx, err := r.Create(&Transaction{
		Hash:      hash,
		Notes:     notes,
		UserID:    userId,
		Amount:    amount,
		Category:  category,
		Timestamp: timestamp,
	})
	if err != nil {
		return CommandResult{Command: cmd, Error: err, UserError: userErrors[Unknown]}
	}

	return CommandResult{Transactions: []*Transaction{tx}, Command: cmd, Error: nil}
}
