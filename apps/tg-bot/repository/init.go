package repository

import "gorm.io/gorm"

type Repositories struct {
	UserRepo   IUserRepository
	OffsetRepo IOffsetRepository
}

var instance *Repositories

func InitRepositories(db *gorm.DB) {
	instance = &Repositories{
		UserRepo:   UserRepositoryImpl(db),
		OffsetRepo: OffsetRepositoryImpl(db),
	}
}

func UserRepo() IUserRepository {
	return instance.UserRepo
}

func OffsetRepo() IOffsetRepository {
	return instance.OffsetRepo
}
