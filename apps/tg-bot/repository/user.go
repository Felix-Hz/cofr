package repository

import (
	"log"
	. "remind0/db"

	telegramClient "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"gorm.io/gorm"
)

type userRepository struct {
	dbClient *gorm.DB
}

type IUserRepository interface {
	// Get the existing user or create a new one if it doesn't exist.
	GetOrCreate(userId int64, sender *telegramClient.User) (*User, error)
	// Get user by internal ID
	GetByID(id uint) (*User, error)
	// Update user
	Update(user *User) error
}

// Factory method to initialise a repository.
func UserRepositoryImpl(dbClient *gorm.DB) IUserRepository {
	return &userRepository{dbClient: dbClient}
}

func (r *userRepository) GetOrCreate(userId int64, sender *telegramClient.User) (*User, error) {
	var user User
	result := r.dbClient.Where("user_id = ?", userId).First(&user)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			user = User{
				UserID:    userId,
				Username:  sender.UserName,
				FirstName: sender.FirstName,
				LastName:  sender.LastName,
			}
			if err := r.dbClient.Create(&user).Error; err != nil {
				return nil, err
			}
			log.Printf("✅ Created new user: %s (%d)", user.FirstName+" "+user.LastName, user.UserID)
		} else {
			return nil, result.Error
		}
	}
	return &user, nil
}

func (r *userRepository) GetByID(id uint) (*User, error) {
	var user User
	err := r.dbClient.Where("id = ?", id).First(&user).Error
	return &user, err
}

func (r *userRepository) Update(user *User) error {
	return r.dbClient.Save(user).Error
}
