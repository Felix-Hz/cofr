package app

import (
	"sort"
	"strings"
	"testing"
)

func TestIsValidCurrency_ValidCodes(t *testing.T) {
	codes := []string{"NZD", "USD", "EUR", "JPY", "GBP"}
	for _, code := range codes {
		if !isValidCurrency(code) {
			t.Errorf("expected %q to be valid", code)
		}
	}
}

func TestIsValidCurrency_CaseInsensitive(t *testing.T) {
	cases := []string{"usd", "Eur", "nzd", "jPy"}
	for _, code := range cases {
		if !isValidCurrency(code) {
			t.Errorf("expected %q to be valid (case-insensitive)", code)
		}
	}
}

func TestIsValidCurrency_InvalidCodes(t *testing.T) {
	codes := []string{"XYZ", "INVALID", "", "AB", "ABCDE"}
	for _, code := range codes {
		if isValidCurrency(code) {
			t.Errorf("expected %q to be invalid", code)
		}
	}
}

func TestSupportedCurrencies_AllKeysAre3Chars(t *testing.T) {
	for code := range supportedCurrencies {
		if len(code) != 3 {
			t.Errorf("currency code %q is not 3 characters", code)
		}
	}
}

func TestSupportedCurrencies_HasExpectedSize(t *testing.T) {
	if len(supportedCurrencies) < 25 {
		t.Errorf("expected at least 25 currencies, got %d", len(supportedCurrencies))
	}
}

func TestGetCurrenciesListMessage_Sorted(t *testing.T) {
	msg := getCurrenciesListMessage()

	// Extract currency codes from the message lines
	lines := strings.Split(msg, "\n")
	var codes []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "•") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				codes = append(codes, parts[1])
			}
		}
	}

	if len(codes) == 0 {
		t.Fatal("no currency codes found in message")
	}

	if !sort.StringsAreSorted(codes) {
		t.Errorf("currency codes are not sorted: %v", codes)
	}
}
