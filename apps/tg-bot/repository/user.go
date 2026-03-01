package repository

import (
	"fmt"
	"time"

	. "remind0/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type userRepository struct {
	dbClient *gorm.DB
}

type IUserRepository interface {
	// Get user by Telegram ID (via auth_providers), returns nil if not found.
	GetByTelegramID(telegramID int64) (*User, error)
	// Get user by internal ID
	GetByID(id uuid.UUID) (*User, error)
	// Update user
	Update(user *User) error
	// Get user by link code (non-expired)
	GetByLinkCode(code string) (*User, error)
	// Link a Telegram account to a user
	LinkTelegram(userID uuid.UUID, telegramID int64) error
}

// Factory method to initialise a repository.
func UserRepositoryImpl(dbClient *gorm.DB) IUserRepository {
	return &userRepository{dbClient: dbClient}
}

func (r *userRepository) GetByTelegramID(telegramID int64) (*User, error) {
	var provider AuthProvider
	result := r.dbClient.Where("provider = ? AND provider_user_id = ?", "telegram", fmt.Sprintf("%d", telegramID)).First(&provider)
	if result.Error != nil {
		return nil, result.Error
	}

	var user User
	result = r.dbClient.Where("id = ?", provider.UserID).First(&user)
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

func (r *userRepository) GetByLinkCode(code string) (*User, error) {
	var user User
	result := r.dbClient.Where("link_code = ? AND link_code_expires > ?", code, time.Now()).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func (r *userRepository) LinkTelegram(userID uuid.UUID, telegramID int64) error {
	return r.dbClient.Transaction(func(tx *gorm.DB) error {
		provider := AuthProvider{
			UserID:         userID,
			Provider:       "telegram",
			ProviderUserID: fmt.Sprintf("%d", telegramID),
		}
		if err := tx.Create(&provider).Error; err != nil {
			return err
		}

		// Clear link code
		return tx.Model(&User{}).Where("id = ?", userID).
			Updates(map[string]interface{}{"link_code": nil, "link_code_expires": nil}).Error
	})
}
