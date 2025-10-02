package app

import (
	"slices"
	"strconv"
	"strings"

	"remind0/db"

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
		if cat.Alias == strings.ToUpper(code) {
			return cat.Name, true
		}
	}
	return "", false
}

type AggregatedTransactions struct {
	Category string
	Total    float64
	Count    int
}

func aggregateCategories(txs []*db.Transaction) []AggregatedTransactions {
	aggMap := make(map[string]AggregatedTransactions)

	for _, tx := range txs {
		if agg, exists := aggMap[tx.Category]; exists {
			agg.Total += tx.Amount
			agg.Count++
			aggMap[tx.Category] = agg
		} else {
			aggMap[tx.Category] = AggregatedTransactions{
				Category: tx.Category,
				Total:    tx.Amount,
				Count:    1,
			}
		}
	}

	aggregated := make([]AggregatedTransactions, 0, len(aggMap))
	for _, agg := range aggMap {
		aggregated = append(aggregated, agg)
	}

	return aggregated
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
func generateMessageHash(category string, amount float64, notes string, timestamp time.Time, userId uint) string {
	hash := sha256.New()

	hash.Write([]byte(category))
	hash.Write([]byte(fmt.Sprintf("%f", amount)))
	hash.Write([]byte(notes))
	hash.Write([]byte(fmt.Sprintf("%d", timestamp.Unix())))
	hash.Write([]byte(fmt.Sprintf("%d", userId)))

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

// String to float64, handling commas and dots.
func stringToFloat(amountStr string) (float64, error) {
	return strconv.ParseFloat(strings.ReplaceAll(amountStr, ",", "."), 64)
}

// Parse multiple amounts from a string, handling batch amounts enclosed in parentheses.
func processBatchAmounts(amountsStr string) ([]float64, error) {
	var amounts []float64

	for amt := range strings.SplitSeq(amountsStr, "-") {
		amount, err := stringToFloat(amt)
		if err != nil {
			return nil, err
		}
		amounts = append(amounts, amount)
	}

	return amounts, nil
}

// Parse amounts which can be either a single amount or a batch enclosed in parentheses.
func parseAmounts(amountStr string) ([]float64, error) {

	// Handle batch amounts enclosed in parentheses
	if strings.ContainsAny(amountStr, "()") {
		return processBatchAmounts(strings.Trim(amountStr, "()"))
	}

	// Handle single amount
	amount, err := stringToFloat(amountStr)
	if err != nil {
		return nil, err
	}
	return []float64{amount}, nil
}

/**
 * Validate and process an add transaction message.
 */
func parseAddTx(msg string) (string, []float64, string, error) {

	/**
	 * Split the message into parts divided by spaces,
	 * and ensure it has at least a category and amount.
	 */
	parts := strings.Fields(msg)
	if len(parts) < 2 {
		return "", nil, "", fmt.Errorf("invalid message format")
	}

	category := parts[0]

	/**
	 * Check if the category is a valid alias and convert it to the full category name.
	 */
	if categoryName, exists := findCategory(category); exists {
		category = categoryName
	} else {
		return "", nil, "", fmt.Errorf("invalid category alias")
	}

	/**
	 * Parse the transaction amount and ensure it's a valid float.
	 */
	amounts, err := parseAmounts(parts[1])
	if err != nil {
		return "", nil, "", fmt.Errorf("failed to parse amount %q: %w", parts[1], err)
	}

	// At least one valid amount is required
	if len(amounts) == 0 {
		return "", nil, "", fmt.Errorf("no valid amounts found")
	}

	/**
	 * Extract transaction notes if they exist.
	 */
	notes := ""
	if len(parts) > 2 {
		notes = strings.Join(parts[2:], " ")
	}

	return category, amounts, notes, nil
}

/**
 *                                                   _
 *                                                  | |
 *      ___ ___  _ __ ___  _ __ ___   __ _ _ __   __| |___
 *     / __/ _ \| '_ ` _ \| '_ ` _ \ / _` | '_ \ / _` / __|
 *    | (_| (_) | | | | | | | | | | | (_| | | | | (_| \__ \
 *     \___\___/|_| |_| |_|_| |_| |_|\__,_|_| |_|\__,_|___/
 *
 *
 */

type ListOptions struct {
	FromTime  time.Time
	ToTime    time.Time
	Category  string
	Aggregate bool
	Limit     int
}

func parseListOptions(args []string, timestamp time.Time) (ListOptions, error) {

	// Date format: DD/MM/YYYY
	const dateLayout = "02/01/2006"

	opts := ListOptions{
		Limit:     10,
		Aggregate: false,
		ToTime:    timestamp,
	}

	// Default case: Current cycle
	if len(args) == 1 {
		opts.FromTime = beginningOfMonth(timestamp)
		return opts, nil
	}

	// Check for aggregate wildcard flag
	if slices.Contains(args, "*") {
		opts.Aggregate = true

		// Command with wildcard means give all back all categories from all time
		if len(args) == 2 {
			return opts, nil
		}
	}

	// Handle all-time ampersand
	if slices.Contains(args, "&") {
		opts.FromTime = time.Unix(0, 0) // Epoch time
		opts.Limit = 50                 // Max limit

		// Command with ampersand means give all back all categories from all time
		if len(args) == 2 {
			return opts, nil
		}

	}

	// Try number for limit
	if n, err := validateLimit(args[1]); err == nil {
		opts.Limit = n
		opts.FromTime = beginningOfMonth(timestamp)
		return opts, nil
	}

	// Try full date first
	if t, err := time.Parse(dateLayout, args[1]); err == nil {
		opts.FromTime = t

		if len(args) > 2 {
			// Try number for limit
			if n, err := validateLimit(args[2]); err == nil {
				opts.Limit = n
				return opts, nil
			}
		}

		return opts, nil
	}

	// Try category
	if category, found := findCategory(args[1]); found {
		opts.Category = category
		opts.FromTime = beginningOfMonth(timestamp)

		// Try date filter on category
		if len(args) > 2 {

			// Try wildcard for aggregate
			if args[2] == "*" {
				opts.Aggregate = true

				if len(args) > 3 {
					// Try number for limit
					if n, err := validateLimit(args[3]); err == nil {
						opts.Limit = n
						return opts, nil
					}

					// Try full date next
					if t, err := time.Parse(dateLayout, args[3]); err == nil {
						opts.FromTime = t
						return opts, nil
					}
				}

				return opts, nil
			}

			// Try full date next
			if t, err := time.Parse(dateLayout, args[2]); err == nil {
				opts.FromTime = t

				if len(args) > 3 {
					// Try number for limit
					if n, err := validateLimit(args[3]); err == nil {
						opts.Limit = n
						return opts, nil
					}
				}

				return opts, nil
			}

			if n, err := validateLimit(args[2]); err == nil {
				opts.Limit = n
				return opts, nil
			}
		}

		return opts, nil
	}

	return opts, fmt.Errorf("invalid arguments")
}

func validateLimit(limit string) (int, error) {
	n, err := strconv.Atoi(limit)
	if err != nil {
		return 0, err
	}
	if n <= 0 || n > 50 {
		return 0, fmt.Errorf("limit must be between 1 and 50")
	}
	return n, nil
}

//  _____ _  _      _____
// /__ __Y \/ \__/|/  __/
//   / \ | || |\/|||  \
//   | | | || |  |||  /_
//   \_/ \_/\_/  \|\____\

// Cycles starting from the 28th each month
func beginningOfMonth(t time.Time) time.Time {
	if t.Day() > 28 {
		// If it's after 28th, return the 28th of current month
		return time.Date(t.Year(), t.Month(), 28, 0, 0, 0, 0, t.Location())
	} else {
		// If it's before 28th, return 28th of previous month
		return time.Date(t.Year(), t.Month(), 28, 0, 0, 0, 0, t.Location()).AddDate(0, -1, 0)
	}
}
