package app

import (
	"fmt"
	. "remind0/db"
	"sort"
)

const SEPARATOR = "════════════"

/**
 * Handle the formatting of success messages for various commands.
 */
func generateSuccessMessage(r CommandResult) string {
	msg := "✅ Command executed successfully."

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

/**
 * Format a return message to inform the user of a successful expense-related operation.
 */
func txSuccessMessage(operation Command, txs []*Transaction) string {
	msg := operationHeaders[operation] + "\n" + SEPARATOR + "\n"

	for _, tx := range txs {
		msg += fmt.Sprintf(
			"🪪 ID: %d\n"+
				"📥 Category: %s\n"+
				"💰 Amount: %.2f %s\n"+
				"📌 Notes: %s\n"+
				"🕒 At: %s\n"+
				SEPARATOR+"\n",
			tx.ID, tx.Category, tx.Amount, tx.Currency, tx.Notes, tx.Timestamp.Format("02-Jan-2006 15:04"),
		)
	}

	return msg
}

/**
 * Format a return message to inform the user of a successful aggregation-related operation.
 */
func aggSuccessMessage(operation Command, aggs []AggregatedTransactions) string {
	msg := operationHeaders[operation] + "\n" + SEPARATOR + "\n"

	for _, agg := range aggs {
		msg += fmt.Sprintf(
			"📥 Category: %s\n"+
				"💰 Total: %.2f\n"+
				"📊 Count: %d\n"+
				SEPARATOR+"\n",
			agg.Category, agg.Total, agg.Count,
		)
	}

	return msg
}

func userHelpMessage(command Command, userInfo string) string {
	return operationHeaders[command] + "\n" + SEPARATOR + "\n" + userInfo + "\n"
}

/**
 * Format a return message to inform the user of the available categories.
 */
func getCategoriesMessage() string {
	categoryList := "Currently supported categories:\n\n"
	for _, cat := range validCategories {
		categoryList += fmt.Sprintf("• %s (%s)\n", cat.Alias, cat.Name)
	}
	return categoryList
}

/**
 * Format a return message to inform the user of the available currencies.
 */
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

/**
 * Map command types to user-friendly headers.
 */
var operationHeaders = map[Command]string{
	Add:           "✅ Expense Recorded",
	Remove:        "✂️ Expense Deleted",
	List:          "📋 Transactions",
	Help:          "💡 Help",
	Edit:          "📝 Expense Updated",
	Configuration: "⚙️ Configuration",
}

/**
 * User-friendly error messages.
 */
var userErrors = map[Command]string{
	Add:           "Please ensure your transaction's category is valid. Use !help add for guidance.",
	Remove:        "Please ensure you provide valid transaction IDs. Use !help remove for guidance.",
	List:          "Please check your options and try again. Use !help list for guidance.",
	Help:          "Please try again later or contact support.",
	Edit:          "Editing transactions is not implemented yet.",
	Configuration: "Please use format: !c set-default-currency <CODE>. Use !help config for guidance.",
	Unknown:       "Something went wrong, please try again later.",
}

type HelpTopic struct {
	Command  Command
	Subtopic string
}

// Prevent from running on every map access.
var categoriesHelpMessage = getCategoriesMessage()
var currenciesHelpMessage = getCurrenciesListMessage()

/**
 * Detailed help messages for each command.
 */
var userHelp = map[HelpTopic]string{
	{Command: Add}: `
Command Name: add (aliases: a)

Usage:
	!add <category> <amount or (n-n)> <notes?> $<currency?>

Examples:
	!add G 45 Woolworths (45 in your default currency)
	!add G 45 Woolworths $USD (45 USD)
	!add G (2.5-8) Farmers market $EUR (2.5 and 8 EUR)

Note:
	• Categories: Use !help categories for list
	• Currencies: Use !help currencies for list
	• Set your default: !c set-default-currency USD
	`,
	{Command: Remove}: `
Command Name: remove (aliases: rm, r, delete, del, d)

Usage:
	!rm <ID1> <ID2> ...: Remove one or more transactions by ID

Examples:
	!rm 42 (Remove transaction #42)
	!rm 42 43 44 (Remove multiple transactions)

Note: IDs can be found using the !ls command
	`,
	{Command: List}: `
Command Name: list (aliases: ls, l)

Usage:
	!ls [options]

Options (any order):
	<category>: Filter by category alias
	<DD/MM/YYYY>: From specific date
	<1-100>: Limit number of results (Defaults to 10)
	+: Aggregate by category
	*: Show all-time transactions
	$<CODE>: Filter by currency (e.g., $USD)

Examples:
	!ls (Last 10 transactions this cycle)
	!ls G (All Groceries transactions)
	!ls + 20 (Last 20 transactions grouped by category)
	!ls $USD (All USD transactions)
	!ls G $EUR 20 (Last 20 EUR grocery transactions)
	`,
	{Command: Help}: `
Command Name: help (aliases: h)

Usage:
	!help: Show this help menu
	!help <command>: Show detailed help for a specific command
	!help categories: List all supported categories
	!help currencies: List all supported currencies

Input Commands:
	• !add <category> <amount> <notes?> $<currency?> - Record an expense/income
	• !ls [options] - View your transactions
	• !rm <ID1> <ID2> ... - Remove transactions
	• !c set-default-currency <CODE> - Set your preferred currency
	• !help - Show this help menu

Quick Examples:
	• !add G 45 Lunch $USD
	• !ls $USD 20
	• !c set-default-currency NZD

Additional Help:
	• Type !help <command> for detailed usage
	• Type !help categories for category list
	• Type !help currencies for currency list
	`,
	{Command: Configuration}: `
Command Name: config (aliases: c, cfg)

Usage:
	!c set-default-currency <CODE>: Set your preferred currency

Aliases:
	• set-default-currency, sdc

Examples:
	!c set-default-currency USD
	!c sdc NZD

Note:
	This currency will be used for all transactions when you don't
	specify a currency explicitly. Use !help currencies for supported codes.
	`,
	{Command: Help, Subtopic: "Categories"}: categoriesHelpMessage,
	{Command: Help, Subtopic: "Currencies"}: currenciesHelpMessage,
}
