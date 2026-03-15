package repository

import "gorm.io/gorm"

type Repositories struct {
	UserRepo        IUserRepository
	OffsetRepo      IOffsetRepository
	TransactionRepo ITransactionRepository
	CategoryRepo    ICategoryRepository
	AccountRepo     IAccountRepository
}

var instance *Repositories

func InitRepositories(db *gorm.DB) {
	instance = &Repositories{
		UserRepo:        UserRepositoryImpl(db),
		OffsetRepo:      OffsetRepositoryImpl(db),
		TransactionRepo: TransactionRepositoryImpl(db),
		CategoryRepo:    CategoryRepositoryImpl(db),
		AccountRepo:     AccountRepositoryImpl(db),
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

func CategoryRepo() ICategoryRepository {
	return instance.CategoryRepo
}

func AccountRepo() IAccountRepository {
	return instance.AccountRepo
}
