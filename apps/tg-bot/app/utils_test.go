package app

import (
	"math"
	"strings"
	"testing"
	"time"

	"remind0/db"
	r "remind0/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// --- Mock CategoryRepo ---

type mockCategoryRepo struct {
	categories []db.Category
}

func (m *mockCategoryRepo) GetForUser(_ uuid.UUID) ([]db.Category, error) {
	return m.categories, nil
}

func (m *mockCategoryRepo) FindByAlias(_ uuid.UUID, alias string) (*db.Category, error) {
	for i, c := range m.categories {
		if c.Alias != nil && *c.Alias == alias {
			return &m.categories[i], nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (m *mockCategoryRepo) InvalidateCache(_ uuid.UUID) {}

// --- Test helpers ---

func strPtr(s string) *string { return &s }

func setupMockRepo() {
	r.SetForTest(&r.Repositories{
		CategoryRepo: &mockCategoryRepo{
			categories: []db.Category{
				{ID: uuid.MustParse("11111111-1111-1111-1111-111111111111"), Name: "Groceries", Alias: strPtr("G"), Type: "expense", IsActive: true, IsSystem: true},
				{ID: uuid.MustParse("22222222-2222-2222-2222-222222222222"), Name: "Transport", Alias: strPtr("T"), Type: "expense", IsActive: true, IsSystem: true},
				{ID: uuid.MustParse("33333333-3333-3333-3333-333333333333"), Name: "Income", Alias: strPtr("I"), Type: "income", IsActive: true, IsSystem: true},
			},
		},
	})
}

var testUserID = uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

// --- stringToFloat tests ---

func TestStringToFloat_Integer(t *testing.T) {
	v, err := stringToFloat("45")
	if err != nil {
		t.Fatal(err)
	}
	if v != 45.0 {
		t.Errorf("expected 45.0, got %f", v)
	}
}

func TestStringToFloat_DecimalDot(t *testing.T) {
	v, err := stringToFloat("12.50")
	if err != nil {
		t.Fatal(err)
	}
	if v != 12.5 {
		t.Errorf("expected 12.5, got %f", v)
	}
}

func TestStringToFloat_CommaDecimal(t *testing.T) {
	v, err := stringToFloat("12,50")
	if err != nil {
		t.Fatal(err)
	}
	if v != 12.5 {
		t.Errorf("expected 12.5, got %f", v)
	}
}

func TestStringToFloat_Invalid(t *testing.T) {
	_, err := stringToFloat("abc")
	if err == nil {
		t.Error("expected error for invalid input")
	}
}

// --- parseAmounts tests ---

func TestParseAmounts_Single(t *testing.T) {
	amounts, err := parseAmounts("45")
	if err != nil {
		t.Fatal(err)
	}
	if len(amounts) != 1 || amounts[0] != 45.0 {
		t.Errorf("expected [45.0], got %v", amounts)
	}
}

func TestParseAmounts_Batch(t *testing.T) {
	amounts, err := parseAmounts("(10-20-30)")
	if err != nil {
		t.Fatal(err)
	}
	if len(amounts) != 3 {
		t.Fatalf("expected 3 amounts, got %d", len(amounts))
	}
	expected := []float64{10, 20, 30}
	for i, e := range expected {
		if amounts[i] != e {
			t.Errorf("amounts[%d] = %f, want %f", i, amounts[i], e)
		}
	}
}

func TestParseAmounts_BatchDecimal(t *testing.T) {
	amounts, err := parseAmounts("(2.5-8)")
	if err != nil {
		t.Fatal(err)
	}
	if len(amounts) != 2 {
		t.Fatalf("expected 2 amounts, got %d", len(amounts))
	}
	if amounts[0] != 2.5 || amounts[1] != 8.0 {
		t.Errorf("expected [2.5, 8.0], got %v", amounts)
	}
}

func TestParseAmounts_InvalidInBatch(t *testing.T) {
	_, err := parseAmounts("(10-abc)")
	if err == nil {
		t.Error("expected error for invalid amount in batch")
	}
}

// --- validateMessage tests ---

func TestValidateMessage_Empty(t *testing.T) {
	if validateMessage("") {
		t.Error("expected false for empty message")
	}
}

func TestValidateMessage_Valid(t *testing.T) {
	if !validateMessage("hello") {
		t.Error("expected true for valid message")
	}
}

func TestValidateMessage_TooLong(t *testing.T) {
	msg := strings.Repeat("a", 501)
	if validateMessage(msg) {
		t.Error("expected false for 501-char message")
	}
}

func TestValidateMessage_MaxLength(t *testing.T) {
	msg := strings.Repeat("a", 500)
	if !validateMessage(msg) {
		t.Error("expected true for exactly 500 chars")
	}
}

// --- generateMessageHash tests ---

func TestGenerateMessageHash_Deterministic(t *testing.T) {
	catID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	ts := time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)

	h1 := generateMessageHash(catID, 45.0, "lunch", ts, testUserID, 0, "NZD")
	h2 := generateMessageHash(catID, 45.0, "lunch", ts, testUserID, 0, "NZD")
	if h1 != h2 {
		t.Error("same inputs should produce same hash")
	}
}

func TestGenerateMessageHash_DiffersByAmount(t *testing.T) {
	catID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	ts := time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)

	h1 := generateMessageHash(catID, 45.0, "lunch", ts, testUserID, 0, "NZD")
	h2 := generateMessageHash(catID, 50.0, "lunch", ts, testUserID, 0, "NZD")
	if h1 == h2 {
		t.Error("different amounts should produce different hashes")
	}
}

func TestGenerateMessageHash_DiffersByBatchIndex(t *testing.T) {
	catID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	ts := time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)

	h1 := generateMessageHash(catID, 45.0, "lunch", ts, testUserID, 0, "NZD")
	h2 := generateMessageHash(catID, 45.0, "lunch", ts, testUserID, 1, "NZD")
	if h1 == h2 {
		t.Error("different batch indices should produce different hashes")
	}
}

func TestGenerateMessageHash_DiffersByCurrency(t *testing.T) {
	catID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	ts := time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)

	h1 := generateMessageHash(catID, 45.0, "lunch", ts, testUserID, 0, "NZD")
	h2 := generateMessageHash(catID, 45.0, "lunch", ts, testUserID, 0, "USD")
	if h1 == h2 {
		t.Error("different currencies should produce different hashes")
	}
}

// --- beginningOfMonth tests ---

func TestBeginningOfMonth_After28th(t *testing.T) {
	date := time.Date(2026, 1, 30, 10, 0, 0, 0, time.UTC)
	result := beginningOfMonth(date)
	expected := time.Date(2026, 1, 28, 0, 0, 0, 0, time.UTC)
	if !result.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, result)
	}
}

func TestBeginningOfMonth_Before28th(t *testing.T) {
	date := time.Date(2026, 1, 15, 10, 0, 0, 0, time.UTC)
	result := beginningOfMonth(date)
	expected := time.Date(2025, 12, 28, 0, 0, 0, 0, time.UTC)
	if !result.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, result)
	}
}

func TestBeginningOfMonth_On28th(t *testing.T) {
	// Day == 28, so t.Day() > 28 is false → returns 28th of previous month
	date := time.Date(2026, 1, 28, 10, 0, 0, 0, time.UTC)
	result := beginningOfMonth(date)
	expected := time.Date(2025, 12, 28, 0, 0, 0, 0, time.UTC)
	if !result.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, result)
	}
}

// --- validateLimit tests ---

func TestValidateLimit_Valid(t *testing.T) {
	n, err := validateLimit("50")
	if err != nil {
		t.Fatal(err)
	}
	if n != 50 {
		t.Errorf("expected 50, got %d", n)
	}
}

func TestValidateLimit_Zero(t *testing.T) {
	_, err := validateLimit("0")
	if err == nil {
		t.Error("expected error for zero limit")
	}
}

func TestValidateLimit_Over100(t *testing.T) {
	_, err := validateLimit("101")
	if err == nil {
		t.Error("expected error for limit > 100")
	}
}

func TestValidateLimit_NonNumeric(t *testing.T) {
	_, err := validateLimit("abc")
	if err == nil {
		t.Error("expected error for non-numeric limit")
	}
}

// --- parseAddTx tests (require mock repo) ---

func TestParseAddTx_Basic(t *testing.T) {
	setupMockRepo()
	cat, amounts, notes, currency, isOB, err := parseAddTx("G 45 lunch", "NZD", testUserID)
	if err != nil {
		t.Fatal(err)
	}
	if cat.Name != "Groceries" {
		t.Errorf("expected Groceries, got %s", cat.Name)
	}
	if len(amounts) != 1 || amounts[0] != 45.0 {
		t.Errorf("expected [45.0], got %v", amounts)
	}
	if notes != "lunch" {
		t.Errorf("expected 'lunch', got %q", notes)
	}
	if currency != "NZD" {
		t.Errorf("expected NZD, got %s", currency)
	}
	if isOB {
		t.Error("expected isOpeningBalance=false")
	}
}

func TestParseAddTx_WithCurrency(t *testing.T) {
	setupMockRepo()
	_, _, _, currency, _, err := parseAddTx("G 45 lunch $USD", "NZD", testUserID)
	if err != nil {
		t.Fatal(err)
	}
	if currency != "USD" {
		t.Errorf("expected USD, got %s", currency)
	}
}

func TestParseAddTx_WithOBFlag(t *testing.T) {
	setupMockRepo()
	_, amounts, notes, _, isOB, err := parseAddTx("G 45 ob:", "NZD", testUserID)
	if err != nil {
		t.Fatal(err)
	}
	if !isOB {
		t.Error("expected isOpeningBalance=true")
	}
	if notes != "" {
		t.Errorf("expected empty notes, got %q", notes)
	}
	if math.Abs(amounts[0]-45.0) > 0.001 {
		t.Errorf("expected 45.0, got %f", amounts[0])
	}
}

func TestParseAddTx_BatchAmounts(t *testing.T) {
	setupMockRepo()
	_, amounts, notes, _, _, err := parseAddTx("G (10-20) notes", "NZD", testUserID)
	if err != nil {
		t.Fatal(err)
	}
	if len(amounts) != 2 || amounts[0] != 10.0 || amounts[1] != 20.0 {
		t.Errorf("expected [10.0, 20.0], got %v", amounts)
	}
	if notes != "notes" {
		t.Errorf("expected 'notes', got %q", notes)
	}
}

func TestParseAddTx_TooFewParts(t *testing.T) {
	setupMockRepo()
	_, _, _, _, _, err := parseAddTx("G", "NZD", testUserID)
	if err == nil {
		t.Error("expected error for too few parts")
	}
}

func TestParseAddTx_InvalidCategory(t *testing.T) {
	setupMockRepo()
	_, _, _, _, _, err := parseAddTx("INVALID 45", "NZD", testUserID)
	if err == nil {
		t.Error("expected error for invalid category")
	}
}

func TestParseAddTx_InvalidAmount(t *testing.T) {
	setupMockRepo()
	_, _, _, _, _, err := parseAddTx("G abc", "NZD", testUserID)
	if err == nil {
		t.Error("expected error for invalid amount")
	}
}

// --- aggregateCategories tests ---

func TestAggregateCategories_Groups(t *testing.T) {
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

	if aggMap["Groceries"].Total != 30 {
		t.Errorf("expected Groceries total 30, got %f", aggMap["Groceries"].Total)
	}
	if aggMap["Groceries"].Count != 2 {
		t.Errorf("expected Groceries count 2, got %d", aggMap["Groceries"].Count)
	}
	if aggMap["Transport"].Total != 15 {
		t.Errorf("expected Transport total 15, got %f", aggMap["Transport"].Total)
	}
}

func TestAggregateCategories_Transfer(t *testing.T) {
	txs := []*db.Transaction{
		{Amount: 100, CategoryRel: nil},
	}

	aggs := aggregateCategories(txs)
	if len(aggs) != 1 {
		t.Fatalf("expected 1 aggregation, got %d", len(aggs))
	}
	if aggs[0].Category != "Transfer" {
		t.Errorf("expected 'Transfer', got %q", aggs[0].Category)
	}
}
