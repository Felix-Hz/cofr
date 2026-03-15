package app

import (
	"fmt"
	"time"

	. "remind0/db"
	r "remind0/repository"

	"github.com/google/uuid"
)

// summaryForMonth generates a summary for the given month boundaries.
func summaryForMonth(userID uuid.UUID, from time.Time, to time.Time) (string, *SummaryResult, error) {
	result, err := r.TxRepo().GetSummary(userID, from, to)
	if err != nil {
		return "", nil, err
	}

	// Get account balances
	balances, _ := r.AccountRepo().GetBalances(userID)

	return formatSummary(result, balances, from, to), result, nil
}

// formatSummary builds the HTML-formatted summary message.
func formatSummary(result *SummaryResult, balances []AccountBalance, from time.Time, to time.Time) string {
	msg := fmt.Sprintf("<b>%s — %s</b>\n\n",
		from.Format("2 Jan"), to.Format("2 Jan 2006"))

	if result.TxCount == 0 {
		msg += "No transactions in this period."
		if len(balances) > 0 {
			msg += "\n\n"
			msg += formatAccountBalances(balances)
		}
		return msg
	}

	if result.TotalIncome > 0 {
		msg += fmt.Sprintf("<b>Income</b>      $%.2f\n", result.TotalIncome)
	}
	msg += fmt.Sprintf("<b>Spent</b>       $%.2f  (%d txns)\n", result.TotalExpense, result.TxCount)

	net := result.TotalIncome - result.TotalExpense
	if result.TotalIncome > 0 {
		sign := "+"
		if net < 0 {
			sign = ""
		}
		msg += fmt.Sprintf("<b>Net</b>         <b>%s$%.2f</b>\n", sign, net)
	}

	// Top spending by category (expense type only)
	var expenseCats []CategorySummary
	for _, cat := range result.ByCategory {
		if cat.CategoryType == "expense" {
			expenseCats = append(expenseCats, cat)
		}
	}

	if len(expenseCats) > 0 {
		msg += "\n<b>Top spending</b>\n"
		maxShow := 5
		if len(expenseCats) < maxShow {
			maxShow = len(expenseCats)
		}
		for _, cat := range expenseCats[:maxShow] {
			pct := 0.0
			if result.TotalExpense > 0 {
				pct = (cat.Total / result.TotalExpense) * 100
			}
			msg += fmt.Sprintf(" %s    $%.2f  %.0f%%\n", escapeHTML(cat.CategoryName), cat.Total, pct)
		}
	}

	// Account balances
	if len(balances) > 0 {
		msg += "\n"
		msg += formatAccountBalances(balances)
	}

	return msg
}

// formatAccountBalances formats account balances for display.
func formatAccountBalances(balances []AccountBalance) string {
	msg := "<b>Account Balances</b>\n"
	for _, b := range balances {
		sign := ""
		if b.Balance > 0 {
			sign = "+"
		}
		msg += fmt.Sprintf(" %s    %s$%.2f\n", escapeHTML(b.AccountName), sign, b.Balance)
	}
	return msg
}

// formatFullBreakdown shows all categories grouped by type.
func formatFullBreakdown(result *SummaryResult, from time.Time, to time.Time) string {
	msg := fmt.Sprintf("<b>%s — %s</b>\n<b>Full Breakdown</b>\n\n",
		from.Format("2 Jan"), to.Format("2 Jan 2006"))

	if result.TxCount == 0 {
		msg += "No transactions in this period."
		return msg
	}

	types := []string{"expense", "income"}
	typeLabels := map[string]string{
		"expense": "Expenses",
		"income":  "Income",
	}

	for _, t := range types {
		var cats []CategorySummary
		for _, cat := range result.ByCategory {
			if cat.CategoryType == t {
				cats = append(cats, cat)
			}
		}
		if len(cats) == 0 {
			continue
		}
		msg += fmt.Sprintf("<b>%s</b>\n", typeLabels[t])
		for _, cat := range cats {
			msg += fmt.Sprintf(" %s    $%.2f  (%d)\n", escapeHTML(cat.CategoryName), cat.Total, cat.Count)
		}
		msg += "\n"
	}

	return msg
}

// currentMonthRange returns the 1st of current month to now.
func currentMonthRange(now time.Time) (time.Time, time.Time) {
	from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	return from, now
}

// previousMonthRange returns the 1st to last day of the previous month.
func previousMonthRange(now time.Time) (time.Time, time.Time) {
	from := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location())
	to := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	return from, to
}
