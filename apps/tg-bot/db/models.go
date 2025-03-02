package db

import "time"

// User Model
type User struct {
	ID       uint      `gorm:"primaryKey"`
	Phone    string    `gorm:"uniqueIndex"`       // Unique phone numbers
	Expenses []Expense `gorm:"foreignKey:UserID"` // One-to-Many Relationship
}

// Expense Model
type Expense struct {
	ID        uint   `gorm:"primaryKey"`
	UserID    uint   `gorm:"index"`
	User      User   `gorm:"constraint:OnDelete:CASCADE"`
	Category  string `gorm:"index"`
	Amount    float64
	Notes     string
	Timestamp time.Time `gorm:"autoCreateTime"`
}
