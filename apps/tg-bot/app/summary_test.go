package app

import (
	"strings"
	"testing"
	"time"

	"remind0/db"
)

func TestFormatSummary_EmptyPeriod(t *testing.T) {
	result := &db.SummaryResult{TxCount: 0}
	from := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)

	msg := formatSummary(result, nil, from, to)

	if !strings.Contains(msg, "No transactions in this period.") {
		t.Errorf("expected empty period message, got:\n%s", msg)
	}
}

func TestFormatSummary_WithExpenses(t *testing.T) {
	result := &db.SummaryResult{
		TotalExpense: 150.0,
		TxCount:      3,
		ByCategory: []db.CategorySummary{
			{CategoryName: "Groceries", CategoryType: "expense", Total: 100, Count: 2},
			{CategoryName: "Transport", CategoryType: "expense", Total: 50, Count: 1},
		},
	}
	from := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)

	msg := formatSummary(result, nil, from, to)

	if !strings.Contains(msg, "Spent") {
		t.Error("expected 'Spent' in message")
	}
	if !strings.Contains(msg, "150.00") {
		t.Error("expected total expense amount")
	}
	if !strings.Contains(msg, "3 txns") {
		t.Error("expected transaction count")
	}
}

func TestFormatSummary_WithIncomeAndExpenses(t *testing.T) {
	result := &db.SummaryResult{
		TotalIncome:  500.0,
		TotalExpense: 150.0,
		TxCount:      5,
		ByCategory: []db.CategorySummary{
			{CategoryName: "Salary", CategoryType: "income", Total: 500, Count: 1},
			{CategoryName: "Groceries", CategoryType: "expense", Total: 150, Count: 4},
		},
	}
	from := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)

	msg := formatSummary(result, nil, from, to)

	if !strings.Contains(msg, "Income") {
		t.Error("expected 'Income' section")
	}
	if !strings.Contains(msg, "Spent") {
		t.Error("expected 'Spent' section")
	}
	if !strings.Contains(msg, "Net") {
		t.Error("expected 'Net' section")
	}
	if !strings.Contains(msg, "+") {
		t.Error("expected positive sign prefix for net > 0")
	}
}

func TestFormatSummary_TopSpendingCapsAt5(t *testing.T) {
	cats := make([]db.CategorySummary, 7)
	for i := range cats {
		cats[i] = db.CategorySummary{
			CategoryName: strings.Repeat("C", i+1),
			CategoryType: "expense",
			Total:        float64(100 - i*10),
			Count:        1,
		}
	}
	result := &db.SummaryResult{
		TotalExpense: 490.0,
		TxCount:      7,
		ByCategory:   cats,
	}
	from := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)

	msg := formatSummary(result, nil, from, to)

	// The 6th category (CCCCCC) should NOT appear
	if strings.Contains(msg, "CCCCCC") {
		t.Error("expected at most 5 categories in top spending")
	}
	// The 5th category (CCCCC) SHOULD appear
	if !strings.Contains(msg, "CCCCC") {
		t.Error("expected 5th category to appear")
	}
}

func TestFormatAccountBalances(t *testing.T) {
	balances := []db.AccountBalance{
		{AccountName: "Checking", Balance: 1500.50},
		{AccountName: "Savings", Balance: -200.0},
	}

	msg := formatAccountBalances(balances)

	if !strings.Contains(msg, "Checking") {
		t.Error("expected account name 'Checking'")
	}
	if !strings.Contains(msg, "+") {
		t.Error("expected positive sign")
	}
	if !strings.Contains(msg, "1500.50") {
		t.Error("expected balance amount")
	}
	if !strings.Contains(msg, "Savings") {
		t.Error("expected account name 'Savings'")
	}
}

func TestFormatFullBreakdown_GroupsByType(t *testing.T) {
	result := &db.SummaryResult{
		TxCount: 3,
		ByCategory: []db.CategorySummary{
			{CategoryName: "Groceries", CategoryType: "expense", Total: 100, Count: 2},
			{CategoryName: "Salary", CategoryType: "income", Total: 500, Count: 1},
		},
	}
	from := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)

	msg := formatFullBreakdown(result, from, to)

	if !strings.Contains(msg, "Expenses") {
		t.Error("expected 'Expenses' section")
	}
	if !strings.Contains(msg, "Income") {
		t.Error("expected 'Income' section")
	}
}

func TestCurrentMonthRange(t *testing.T) {
	now := time.Date(2026, 3, 15, 10, 0, 0, 0, time.UTC)
	from, to := currentMonthRange(now)

	expectedFrom := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	if !from.Equal(expectedFrom) {
		t.Errorf("expected from %v, got %v", expectedFrom, from)
	}
	if !to.Equal(now) {
		t.Errorf("expected to %v, got %v", now, to)
	}
}

func TestPreviousMonthRange(t *testing.T) {
	now := time.Date(2026, 3, 15, 10, 0, 0, 0, time.UTC)
	from, to := previousMonthRange(now)

	expectedFrom := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)
	expectedTo := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	if !from.Equal(expectedFrom) {
		t.Errorf("expected from %v, got %v", expectedFrom, from)
	}
	if !to.Equal(expectedTo) {
		t.Errorf("expected to %v, got %v", expectedTo, to)
	}
}
