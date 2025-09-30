package repository

import (
	. "remind0/db"

	"gorm.io/gorm"
)

type offsetRepository struct {
	dbClient *gorm.DB
}

type IOffsetRepository interface {
	// Get the existing offset or create a new one if it doesn't exist.
	GetOrCreate() (*Offset, error)
	// Update the offset value in the database to keep track of processed updates.
	UpdateLastSeen(offset *Offset, id int) error
}

// Factory method to initialise a repository.
func OffsetRepositoryImpl(dbClient *gorm.DB) IOffsetRepository {
	return &offsetRepository{dbClient: dbClient}
}

func (r *offsetRepository) GetOrCreate() (*Offset, error) {
	var offset Offset

	result := r.dbClient.First(&offset)
	if result.Error != nil {
		offset = Offset{Offset: 0}

		if err := r.dbClient.Create(&offset).Error; err != nil {
			return nil, err
		}
	}

	return &offset, nil
}

func (r *offsetRepository) UpdateLastSeen(offset *Offset, id int) error {
	offset.Offset = id
	return r.dbClient.Save(offset).Error
}
