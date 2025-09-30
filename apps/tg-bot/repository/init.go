package repository

import "gorm.io/gorm"

type Repositories struct {
	UserRepo   IUserRepository
	OffsetRepo IOffsetRepository
}

func InitRepositories(db *gorm.DB) *Repositories {
	return &Repositories{
		UserRepo:   UserRepositoryImpl(db),
		OffsetRepo: OffsetRepositoryImpl(db),
	}
}
