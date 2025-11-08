package app

import (
	"strings"
)

// Supported major currencies (ISO 4217 codes)
var supportedCurrencies = map[string]string{
	"ARS": "Argentine Peso",
	"NZD": "New Zealand Dollar",
	"USD": "US Dollar",
	"EUR": "Euro",
	"AUD": "Australian Dollar",
	"JPY": "Japanese Yen",
	"BRL": "Brazilian Real",
	"GBP": "British Pound",
	"CAD": "Canadian Dollar",
	"CHF": "Swiss Franc",
	"CNY": "Chinese Yuan",
	"INR": "Indian Rupee",
	"MXN": "Mexican Peso",
	"ZAR": "South African Rand",
	"SEK": "Swedish Krona",
	"NOK": "Norwegian Krone",
	"DKK": "Danish Krone",
	"SGD": "Singapore Dollar",
	"HKD": "Hong Kong Dollar",
	"KRW": "South Korean Won",
	"RUB": "Russian Ruble",
	"TRY": "Turkish Lira",
	"PLN": "Polish Zloty",
	"THB": "Thai Baht",
	"MYR": "Malaysian Ringgit",
}

func isValidCurrency(code string) bool {
	_, exists := supportedCurrencies[strings.ToUpper(code)]
	return exists
}
