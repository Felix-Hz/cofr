package db

import "time"

/*
 * 							User Model
 *
 * This model is used to store the users registered with the bot.
 *
 */
type User struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    int64     `gorm:"uniqueIndex"`       // Index Telegram user IDs
	FirstName string    `gorm:"index"`             // Index first names
	LastName  string    `gorm:"index"`             // Index last names
	Username  string    `gorm:"uniqueIndex"`       // Index usernames
	Expenses  []Expense `gorm:"foreignKey:UserID"` // One-to-Many Relationship
}

/*
 * 							Expense Model
 *
 * This model is used to store the expenses recorded by the bot.
 *
 */
type Expense struct {
	ID        uint   `gorm:"primaryKey"`
	UserID    uint   `gorm:"index"`
	User      User   `gorm:"constraint:OnDelete:CASCADE"`
	Category  string `gorm:"index"`
	Amount    float64
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
