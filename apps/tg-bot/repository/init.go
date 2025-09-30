package repository

import "gorm.io/gorm"

type Repositories struct {
	UserRepo        IUserRepository
	OffsetRepo      IOffsetRepository
	TransactionRepo ITransactionRepository
}

var instance *Repositories

func InitRepositories(db *gorm.DB) {
	instance = &Repositories{
		UserRepo:        UserRepositoryImpl(db),
		OffsetRepo:      OffsetRepositoryImpl(db),
		TransactionRepo: TransactionRepositoryImpl(db),
	}
}

func UserRepo() IUserRepository {
	return instance.UserRepo
}

func OffsetRepo() IOffsetRepository {
	return instance.OffsetRepo
}

func TxRepo() ITransactionRepository {
	return instance.TransactionRepo
}
