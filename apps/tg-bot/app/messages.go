package app

import (
	"fmt"
	. "remind0/db"
	r "remind0/repository"
	"sort"

	"github.com/google/uuid"
)

const SEPARATOR = "════════════"

// generateSuccessMessage routes to the appropriate formatter (plain text, for legacy bot.Send calls).
func generateSuccessMessage(r CommandResult) string {
	msg := "Command executed successfully."

	if txs := r.Transactions; txs != nil {
		msg = txSuccessMessage(r.Command, txs)
	}

	if aggs := r.Aggregated; aggs != nil {
		msg = aggSuccessMessage(r.Command, aggs)
	}

	if r.UserInfo != "" {
		msg = userHelpMessage(r.Command, r.UserInfo)
	}

	return msg
}

// formatHTMLReceipt formats a single transaction as an HTML receipt.
func formatHTMLReceipt(operation Command, tx *Transaction) string {
	catName := "Transfer"
	icon := ""
	if tx.CategoryRel != nil {
		catName = tx.CategoryRel.Name
		if catName == "" {
			catName = "Unknown"
		}
		if tx.CategoryRel.Icon != nil && *tx.CategoryRel.Icon != "" {
			icon = *tx.CategoryRel.Icon + " "
		}
	}

	header := operationHeaders[operation]
	notes := ""
	if tx.Notes != "" {
		notes = fmt.Sprintf("\n📌 %s", escapeHTML(tx.Notes))
	}

	receipt := ""
	if tx.ReceiptFileID != nil {
		receipt = "\n📷 Receipt attached"
	}

	return fmt.Sprintf(
		"<b>%s</b>\n\n"+
			"%s<b>%s</b>\n"+
			"<code>$%.2f %s</code>%s\n"+
			"🕒 %s%s",
		header,
		icon, escapeHTML(catName),
		tx.Amount, tx.Currency, notes,
		tx.Timestamp.Format("02 Jan 2006 15:04"), receipt,
	)
}

// txSuccessMessage formats transaction results with HTML.
func txSuccessMessage(operation Command, txs []*Transaction) string {
	if len(txs) == 1 {
		return formatHTMLReceipt(operation, txs[0])
	}

	msg := fmt.Sprintf("<b>%s</b>\n%s\n", operationHeaders[operation], SEPARATOR)

	for _, tx := range txs {
		catName := "Transfer"
		if tx.CategoryRel != nil {
			catName = tx.CategoryRel.Name
			if catName == "" {
				catName = "Unknown"
			}
		}
		notes := ""
		if tx.Notes != "" {
			notes = fmt.Sprintf("  %s", escapeHTML(tx.Notes))
		}
		msg += fmt.Sprintf(
			"<code>%s</code>  %s  <code>$%.2f %s</code>%s\n",
			tx.ID.String()[:8], escapeHTML(catName), tx.Amount, tx.Currency, notes,
		)
	}

	return msg
}

// aggSuccessMessage formats aggregated transaction results with HTML.
func aggSuccessMessage(operation Command, aggs []AggregatedTransactions) string {
	msg := fmt.Sprintf("<b>%s</b>\n%s\n", operationHeaders[operation], SEPARATOR)

	for _, agg := range aggs {
		msg += fmt.Sprintf(
			"<b>%s</b>  <code>$%.2f</code>  (%d)\n",
			escapeHTML(agg.Category), agg.Total, agg.Count,
		)
	}

	return msg
}

func userHelpMessage(command Command, userInfo string) string {
	return fmt.Sprintf("<b>%s</b>\n%s\n%s\n", operationHeaders[command], SEPARATOR, userInfo)
}

// getCategoriesMessageForUser fetches categories dynamically from DB for the given user.
func getCategoriesMessageForUser(userID uuid.UUID) string {
	cats, err := r.CategoryRepo().GetForUser(userID)
	if err != nil {
		return "Failed to load categories. Please try again."
	}

	categoryList := "Your available categories:\n\n"
	for _, cat := range cats {
		alias := "-"
		if cat.Alias != nil && *cat.Alias != "" {
			alias = *cat.Alias
		}
		icon := ""
		if cat.Icon != nil && *cat.Icon != "" {
			icon = *cat.Icon + " "
		}
		categoryList += fmt.Sprintf("• %s%s (%s)\n", icon, alias, cat.Name)
	}
	return categoryList
}

// getCurrenciesListMessage returns a sorted list of supported currencies.
func getCurrenciesListMessage() string {
	currencyList := "Currencies supported:\n"

	var currencies []string
	for code := range supportedCurrencies {
		currencies = append(currencies, code)
	}

	sort.Strings(currencies)
	for _, code := range currencies {
		currencyList += fmt.Sprintf("• %s - %s\n", code, supportedCurrencies[code])
	}

	return currencyList
}

// operationHeaders maps command types to user-friendly headers.
var operationHeaders = map[Command]string{
	Add:           "Expense Recorded",
	Remove:        "Expense Deleted",
	List:          "Transactions",
	Help:          "Help",
	Edit:          "Expense Updated",
	Configuration: "Configuration",
	Summary:       "Summary",
	Transfer:      "Transfer Complete",
}

// userErrors maps command types to user-friendly error messages.
var userErrors = map[Command]string{
	Add:           "Please ensure your transaction's category is valid. Use /help add for guidance.",
	Remove:        "Please ensure you provide valid transaction IDs. Use /help remove for guidance.",
	List:          "Please check your options and try again. Use /help list for guidance.",
	Help:          "Please try again later or contact support.",
	Edit:          "Use /edit to edit a recent transaction.",
	Configuration: "Please use format: /config set-default-currency <CODE>",
	Unknown:       "Something went wrong, please try again later.",
	Summary:       "Failed to generate summary. Please try again.",
}

type HelpTopic struct {
	Command  Command
	Subtopic string
}

var currenciesHelpMessage = getCurrenciesListMessage()

// Help text for new commands
const helpSummaryText = `
Command: /summary

Shows spending summary for the current calendar month.

Usage:
  /summary — Current month overview

Tap "Full Breakdown" to see all categories.
Tap "Last Month" for previous month.
`

const helpEditText = `
Command: /edit

Edit a recent transaction.

Usage:
  /edit — Pick from last 5 transactions

After selecting, tap a field to change it,
then tap "Save" to commit changes.
`

const helpTransferText = `
Command: /transfer

Transfer money between accounts.

Usage:
  /transfer — Guided flow with buttons

Steps:
  1. Select the "from" account
  2. Select the "to" account
  3. Enter the amount
  4. Confirm (optionally change currency or add notes)
`

// userHelp contains detailed help messages for each command.
var userHelp = map[HelpTopic]string{
	{Command: Add}: `
Command: /add (or just type)

Usage:
  /add <category> <amount or (n-n)> <notes?> $<currency?>
  Or just type: G 45 Woolworths

Examples:
  G 45 Woolworths (45 in your default currency)
  /add G 45 Woolworths $USD (45 USD)
  /add G (2.5-8) Farmers market $EUR (2.5 and 8 EUR)
  /add (no args — guided flow with buttons)

Note:
  • Use /help categories for category list
  • Use /help currencies for currency list
  • Set your default: /config set-default-currency USD
`,
	{Command: Remove}: `
Command: /remove

Usage:
  /remove <ID1> <ID2> ...: Remove one or more transactions by ID

Examples:
  /remove abc123... (Remove transaction by UUID)

Note: IDs can be found using the /list command
`,
	{Command: List}: `
Command: /list

Usage:
  /list [options]

Options (any order):
  <category>: Filter by category alias
  <DD/MM/YYYY>: From specific date
  <1-100>: Limit number of results (Defaults to 10)
  +: Aggregate by category
  *: Show all-time transactions
  $<CODE>: Filter by currency (e.g., $USD)

Examples:
  /list (Last 10 transactions this cycle)
  /list G (All Groceries transactions)
  /list + 20 (Last 20 grouped by category)
  /list $USD (All USD transactions)
`,
	{Command: Help}: `
<b>Cofr Bot — Commands</b>

<b>Quick Add</b> — just type: G 45 Lunch
<b>/add</b> — Record an expense or income
<b>/transfer</b> — Transfer between accounts
<b>/list</b> — View recent transactions
<b>/summary</b> — Spending summary
<b>/edit</b> — Edit a recent transaction
<b>/remove</b> — Delete a transaction
<b>/config</b> — Set default currency
<b>/help</b> — This help menu

Tap a topic below for details:
`,
	{Command: Configuration}: `
Command: /config (or !c, !cfg)

Usage:
  /config set-default-currency <CODE>

Aliases:
  set-default-currency, sdc

Examples:
  /config set-default-currency USD
  /config sdc NZD

Note:
  This currency will be used for all transactions when you don't
  specify a currency explicitly. Use /help currencies for codes.
`,
	{Command: Help, Subtopic: "Currencies"}: currenciesHelpMessage,
}
