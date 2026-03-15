package db

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

/*
 * 							User Model
 *
 * This model is used to store the users registered with the bot.
 *
 */
type User struct {
	ID                uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	FirstName         string     `gorm:"index"`         // Index first names
	LastName          string     `gorm:"index"`         // Index last names
	Username          string     `gorm:"uniqueIndex"`   // Index usernames
	PreferredCurrency string     `gorm:"default:'NZD'"` // User's preferred currency
	DefaultAccountID  *uuid.UUID `gorm:"type:uuid;column:default_account_id"`
	LinkCode          *string    `gorm:"column:link_code"`
	LinkCodeExpires   *time.Time `gorm:"column:link_code_expires"`
	DeletedAt         gorm.DeletedAt
	Expenses          []Transaction `gorm:"foreignKey:UserID"` // One-to-Many Relationship
	Accounts          []Account     `gorm:"foreignKey:UserID"`
}

/*
 * 							AuthProvider Model
 *
 * Maps external auth identities (Google, Telegram) to internal users.
 *
 */
type AuthProvider struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID         uuid.UUID `gorm:"type:uuid;index"`
	Provider       string    `gorm:"index"`
	ProviderUserID string    `gorm:"column:provider_user_id"`
	Email          *string
	DisplayName    *string `gorm:"column:display_name"`
}

func (AuthProvider) TableName() string {
	return "auth_providers"
}

/*
 * 							Account Model
 *
 * Financial accounts (Checking, Savings, Investment, custom).
 *
 */
type Account struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID       uuid.UUID `gorm:"type:uuid;index"`
	Name         string    `gorm:"size:60"`
	Type         string    `gorm:"size:20"` // checking, savings, investment
	IsSystem     bool      `gorm:"default:false"`
	DisplayOrder int       `gorm:"default:0"`
	CreatedAt    time.Time
}

/*
 * 							Category Model
 *
 * Categories for transactions. System categories (user_id = NULL) are shared across all users.
 * Custom categories are per-user.
 *
 */
type Category struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID       *uuid.UUID `gorm:"type:uuid;index"`
	Name         string     `gorm:"size:60"`
	Slug         string     `gorm:"size:60"`
	ColorLight   string     `gorm:"column:color_light;size:7"`
	ColorDark    string     `gorm:"column:color_dark;size:7"`
	Icon         *string    `gorm:"size:30"`
	IsActive     bool       `gorm:"default:true"`
	IsSystem     bool       `gorm:"default:true"`
	DisplayOrder int        `gorm:"default:0"`
	Type         string     `gorm:"size:10;default:'expense'"`
	Alias        *string    `gorm:"size:10"`
	CreatedAt    time.Time
}

/*
 * 							UserCategoryPreference Model
 *
 * Stores per-user toggles for system categories.
 *
 */
type UserCategoryPreference struct {
	UserID     uuid.UUID `gorm:"type:uuid;primaryKey"`
	CategoryID uuid.UUID `gorm:"type:uuid;primaryKey"`
	IsActive   bool      `gorm:"default:true"`
}

func (UserCategoryPreference) TableName() string {
	return "user_category_preferences"
}

/*
 * 							Transaction Model
 *
 * This model is used to store the transactions recorded by the bot.
 *
 */
type Transaction struct {
	ID                  uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID              uuid.UUID  `gorm:"type:uuid;index"`
	User                User       `gorm:"constraint:OnDelete:CASCADE"`
	CategoryID          *uuid.UUID `gorm:"type:uuid;index;column:category_id"`
	CategoryRel         *Category  `gorm:"foreignKey:CategoryID"`
	AccountID           uuid.UUID  `gorm:"type:uuid;index;column:account_id"`
	AccountRel          Account    `gorm:"foreignKey:AccountID"`
	LinkedTransactionID *uuid.UUID `gorm:"type:uuid;column:linked_transaction_id"`
	IsTransfer          bool       `gorm:"column:is_transfer;default:false"`
	TransferDirection   *string    `gorm:"column:transfer_direction;size:4"` // 'from' or 'to'
	Amount              float64
	Currency            string `gorm:"default:'NZD';index"` // ISO 4217 currency code
	Notes               string
	Timestamp           time.Time `gorm:"autoCreateTime"`
	Hash                string    `gorm:"uniqueIndex"`
	ReceiptFileID       *string   `gorm:"column:receipt_file_id"`
	IsOpeningBalance    bool      `gorm:"column:is_opening_balance;default:false"`
}

/*
 * 							SummaryResult
 *
 * Returned by GetSummary — totals by category type + per-category breakdown.
 *
 */
type SummaryResult struct {
	TotalIncome  float64
	TotalExpense float64
	TxCount      int
	ByCategory   []CategorySummary
}

type CategorySummary struct {
	CategoryName string
	CategoryType string
	Total        float64
	Count        int
}

/*
 * 							AccountBalance
 *
 * Returned by GetAccountBalances — per-account balance.
 *
 */
type AccountBalance struct {
	AccountID   uuid.UUID
	AccountName string
	AccountType string
	Balance     float64
}

/*
 * 							Offset Model
 *
 * This model is used to store the last update ID processed by the
 * bot, used to prevent processing the same update multiple times.
 *
 */
type Offset struct {
	ID     uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Offset int
}
