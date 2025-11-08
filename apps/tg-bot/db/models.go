package db

import "time"

/*
 * 							User Model
 *
 * This model is used to store the users registered with the bot.
 *
 */
type User struct {
	ID                uint          `gorm:"primaryKey"`
	UserID            int64         `gorm:"uniqueIndex"`       // Index Telegram user IDs
	FirstName         string        `gorm:"index"`             // Index first names
	LastName          string        `gorm:"index"`             // Index last names
	Username          string        `gorm:"uniqueIndex"`       // Index usernames
	PreferredCurrency string        `gorm:"default:'NZD'"`     // User's preferred currency
	Expenses          []Transaction `gorm:"foreignKey:UserID"` // One-to-Many Relationship
}

/*
 * 							Transaction Model
 *
 * This model is used to store the transactions recorded by the bot.
 *
 */
type Transaction struct {
	ID        uint   `gorm:"primaryKey"`
	UserID    uint   `gorm:"index"`
	User      User   `gorm:"constraint:OnDelete:CASCADE"`
	Category  string `gorm:"index"`
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
	ID     uint `gorm:"primaryKey"`
	Offset int
}
