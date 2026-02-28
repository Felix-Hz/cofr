package repository

import (
	. "remind0/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type userRepository struct {
	dbClient *gorm.DB
}

type IUserRepository interface {
	// Get user by Telegram ID, returns nil if not found.
	GetByTelegramID(telegramID int64) (*User, error)
	// Get user by internal ID
	GetByID(id uuid.UUID) (*User, error)
	// Update user
	Update(user *User) error
}

// Factory method to initialise a repository.
func UserRepositoryImpl(dbClient *gorm.DB) IUserRepository {
	return &userRepository{dbClient: dbClient}
}

func (r *userRepository) GetByTelegramID(telegramID int64) (*User, error) {
	var user User
	result := r.dbClient.Where("user_id = ?", telegramID).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func (r *userRepository) GetByID(id uuid.UUID) (*User, error) {
	var user User
	err := r.dbClient.Where("id = ?", id).First(&user).Error
	return &user, err
}

func (r *userRepository) Update(user *User) error {
	return r.dbClient.Save(user).Error
}
