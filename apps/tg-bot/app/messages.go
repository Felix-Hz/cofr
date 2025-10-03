package app

import (
	"fmt"
	. "remind0/db"
)

var operationHeaders = map[Command]string{
	Help:   "💡 Help",
	List:   "📋 Transactions",
	Edit:   "📝 Expense Updated",
	Remove: "✂️ Expense Deleted",
	Add:    "✅ Expense Recorded",
}

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

	return msg
}

/**
 * Format a return message to inform the user of a successful expense-related operation.
 */
func txSuccessMessage(operation Command, txs []*Transaction) string {
	msg := operationHeaders[operation] + "\n════════════\n"

	for _, tx := range txs {
		msg += fmt.Sprintf(
			"🪪 ID: %d\n"+
				"📥 Category: %s\n"+
				"💰 Amount: $%.2f\n"+
				"📌 Notes: %s\n"+
				"🕒 At: %s\n"+
				"════════════\n",
			tx.ID, tx.Category, tx.Amount, tx.Notes, tx.Timestamp.Format("02-Jan-2006 15:04"),
		)
	}

	return msg
}

/**
 * Format a return message to inform the user of a successful aggregation-related operation.
 */
func aggSuccessMessage(operation Command, aggs []AggregatedTransactions) string {
	msg := operationHeaders[operation] + "\n════════════\n"

	for _, agg := range aggs {
		msg += fmt.Sprintf(
			"📥 Category: %s\n"+
				"💰 Total: $%.2f\n"+
				"📊 Count: %d\n"+
				"════════════\n",
			agg.Category, agg.Total, agg.Count,
		)
	}

	return msg
}

/**
 * Format a return message to inform the user of the correct format.
 */
func addMessageError() string {
	var categoryList string
	for _, cat := range validCategories {
		categoryList += fmt.Sprintf("• %s (%s)\n", cat.Alias, cat.Name)
	}
	return fmt.Sprintf("══════════════\n\n"+"📝 Expected Format:\n"+
		"• <category> <amount> <notes?>\n\n"+
		"💡 Example:\n"+
		"• G 45 Woolworths\n"+
		"• + 90 Salary\n\n"+
		"✅ Valid Categories:\n"+
		"%s"+
		"══════════════\n", categoryList)
}
