package app

import (
	"fmt"
	"time"
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

	if tx := r.Transaction; tx != nil {
		msg = txSuccessMessage(r.Command, tx.ID, tx.Category, tx.Amount, tx.Notes, tx.Timestamp)
	}

	return msg
}

/**
 * Format a return message to inform the user of a successful expense-related operation.
 */
func txSuccessMessage(operation Command, id uint, category string, amount float64, notes string, timestamp time.Time) string {
	return fmt.Sprintf(
		"%s \n"+
			"════════════\n"+
			"🪪 ID: %d\n"+
			"📥 Category: %s\n"+
			"💰 Amount: $%.2f\n"+
			"📌 Notes: %s\n"+
			"🕒 At: %s\n"+
			"════════════",
		operationHeaders[operation], id, category, amount, notes, timestamp.Format("02-Jan-2006 15:04"),
	)
}

/**
 * Format a return message to inform the user of the correct format.
 */
func addMessageError() string {
	var categoryList string
	for _, cat := range validCategories {
		categoryList += fmt.Sprintf("• %s (%s)\n", cat.Alias, cat.Name)
	}
	return fmt.Sprintf("\n══════════════\n\n"+"📝 Expected Format:\n"+
		"• <category> <amount> <notes?>\n\n"+
		"💡 Example:\n"+
		"• G 45 Woolworths\n"+
		"• + 90 Salary\n\n"+
		"✅ Valid Categories:\n"+
		"%s"+
		"══════════════\n", categoryList)
}
