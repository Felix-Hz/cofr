package app

import (
	"strings"
	"testing"
	"time"

	"remind0/db"

	"github.com/google/uuid"
)

func makeTx(amount float64, currency string, notes string, cat *db.Category, receiptFileID *string) *db.Transaction {
	tx := &db.Transaction{
		ID:        uuid.New(),
		Amount:    amount,
		Currency:  currency,
		Notes:     notes,
		Timestamp: time.Date(2026, 3, 15, 14, 30, 0, 0, time.UTC),
	}
	if cat != nil {
		tx.CategoryID = &cat.ID
		tx.CategoryRel = cat
	}
	tx.ReceiptFileID = receiptFileID
	return tx
}

func TestFormatHTMLReceipt_Basic(t *testing.T) {
	icon := "🛒"
	cat := &db.Category{ID: uuid.New(), Name: "Groceries", Icon: &icon}
	tx := makeTx(45.0, "NZD", "", cat, nil)

	result := formatHTMLReceipt(Add, tx)

	checks := []string{"Expense Recorded", "Groceries", "45.00", "NZD", "15 Mar 2026"}
	for _, check := range checks {
		if !strings.Contains(result, check) {
			t.Errorf("expected result to contain %q, got:\n%s", check, result)
		}
	}
}

func TestFormatHTMLReceipt_WithNotes(t *testing.T) {
	cat := &db.Category{ID: uuid.New(), Name: "Food"}
	tx := makeTx(12.0, "USD", "lunch special", cat, nil)

	result := formatHTMLReceipt(Add, tx)

	if !strings.Contains(result, "📌") {
		t.Error("expected 📌 icon for notes")
	}
	if !strings.Contains(result, "lunch special") {
		t.Error("expected notes text in output")
	}
}

func TestFormatHTMLReceipt_WithReceipt(t *testing.T) {
	cat := &db.Category{ID: uuid.New(), Name: "Food"}
	fileID := "telegram_file_123"
	tx := makeTx(10.0, "NZD", "", cat, &fileID)

	result := formatHTMLReceipt(Add, tx)

	if !strings.Contains(result, "📷 Receipt attached") {
		t.Error("expected receipt badge")
	}
}

func TestFormatHTMLReceipt_Transfer_NilCategory(t *testing.T) {
	tx := makeTx(100.0, "NZD", "", nil, nil)

	result := formatHTMLReceipt(Transfer, tx)

	if !strings.Contains(result, "Transfer") {
		t.Error("expected 'Transfer' for nil category")
	}
}

func TestTxSuccessMessage_Single(t *testing.T) {
	cat := &db.Category{ID: uuid.New(), Name: "Groceries"}
	tx := makeTx(45.0, "NZD", "", cat, nil)

	result := txSuccessMessage(Add, []*db.Transaction{tx})

	if !strings.Contains(result, "Groceries") {
		t.Error("expected category name in single tx message")
	}
	if !strings.Contains(result, "45.00") {
		t.Error("expected amount in single tx message")
	}
}

func TestTxSuccessMessage_Batch(t *testing.T) {
	cat := &db.Category{ID: uuid.New(), Name: "Groceries"}
	tx1 := makeTx(10.0, "NZD", "", cat, nil)
	tx2 := makeTx(20.0, "NZD", "", cat, nil)

	result := txSuccessMessage(Add, []*db.Transaction{tx1, tx2})

	if !strings.Contains(result, SEPARATOR) {
		t.Error("expected separator in batch message")
	}
	// Should contain both short IDs
	if !strings.Contains(result, tx1.ID.String()[:8]) {
		t.Error("expected first tx short ID")
	}
	if !strings.Contains(result, tx2.ID.String()[:8]) {
		t.Error("expected second tx short ID")
	}
}

func TestAggregateCategories_Groups_Messages(t *testing.T) {
	groceries := &db.Category{Name: "Groceries"}
	transport := &db.Category{Name: "Transport"}
	txs := []*db.Transaction{
		{Amount: 10, CategoryRel: groceries},
		{Amount: 20, CategoryRel: groceries},
		{Amount: 15, CategoryRel: transport},
	}

	aggs := aggregateCategories(txs)
	if len(aggs) != 2 {
		t.Fatalf("expected 2 aggregations, got %d", len(aggs))
	}

	aggMap := make(map[string]AggregatedTransactions)
	for _, a := range aggs {
		aggMap[a.Category] = a
	}

	if aggMap["Groceries"].Total != 30 || aggMap["Groceries"].Count != 2 {
		t.Errorf("Groceries aggregation wrong: %+v", aggMap["Groceries"])
	}
	if aggMap["Transport"].Total != 15 || aggMap["Transport"].Count != 1 {
		t.Errorf("Transport aggregation wrong: %+v", aggMap["Transport"])
	}
}

func TestAggregateCategories_Transfer_Messages(t *testing.T) {
	txs := []*db.Transaction{
		{Amount: 100, CategoryRel: nil},
	}

	aggs := aggregateCategories(txs)
	if len(aggs) != 1 || aggs[0].Category != "Transfer" {
		t.Errorf("expected Transfer aggregation, got %+v", aggs)
	}
}
