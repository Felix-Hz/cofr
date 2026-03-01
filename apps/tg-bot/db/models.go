package db

import (
	"time"

	"github.com/google/uuid"
)

/*
 * 							User Model
 *
 * This model is used to store the users registered with the bot.
 *
 */
type User struct {
	ID                uuid.UUID     `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	FirstName         string        `gorm:"index"`             // Index first names
	LastName          string        `gorm:"index"`             // Index last names
	Username          string        `gorm:"uniqueIndex"`       // Index usernames
	PreferredCurrency string        `gorm:"default:'NZD'"`     // User's preferred currency
	LinkCode          *string       `gorm:"column:link_code"`
	LinkCodeExpires   *time.Time    `gorm:"column:link_code_expires"`
	Expenses          []Transaction `gorm:"foreignKey:UserID"` // One-to-Many Relationship
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
	DisplayName    *string   `gorm:"column:display_name"`
}

func (AuthProvider) TableName() string {
	return "auth_providers"
}

/*
 * 							Transaction Model
 *
 * This model is used to store the transactions recorded by the bot.
 *
 */
type Transaction struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;index"`
	User      User      `gorm:"constraint:OnDelete:CASCADE"`
	Category  string    `gorm:"index"`
	Amount    float64
	Currency  string `gorm:"default:'NZD';index"` // ISO 4217 currency code
	Notes     string
	Timestamp time.Time `gorm:"autoCreateTime"`
	Hash      string    `gorm:"uniqueIndex"`
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
