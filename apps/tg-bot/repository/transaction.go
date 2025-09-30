package repository

import (
	. "remind0/db"

	"gorm.io/gorm"
)

type transactionRepository struct {
	dbClient *gorm.DB
}

type ITransactionRepository interface {
	Create(transaction *Transaction) (*Transaction, error)
	Delete(transaction *Transaction) error

	GetById(id int64, userId uint) (*Transaction, error)
	GetByHash(hash string, userId uint) (*Transaction, error)
}

// Factory method to initialise a repository.
func TransactionRepositoryImpl(dbClient *gorm.DB) ITransactionRepository {
	return &transactionRepository{dbClient: dbClient}
}

func (r *transactionRepository) Create(tx *Transaction) (*Transaction, error) {
	result := r.dbClient.Create(&tx)
	if result.Error != nil {
		return nil, result.Error
	}
	return tx, nil
}

func (r *transactionRepository) Delete(tx *Transaction) error {
	result := r.dbClient.Delete(&tx)
	if result.Error != nil || result.RowsAffected == 0 {
		return result.Error
	}
	return nil
}

func (r *transactionRepository) GetById(id int64, userId uint) (*Transaction, error) {
	var transaction Transaction
	result := r.dbClient.Where("id = ? and user_id = ?", id, userId).First(&transaction)
	if result.Error != nil {
		return nil, result.Error
	}
	return &transaction, nil
}

func (r *transactionRepository) GetByHash(hash string, userId uint) (*Transaction, error) {
	var transaction Transaction
	result := r.dbClient.Where("hash = ? and user_id = ?", hash, userId).First(&transaction)
	if result.Error != nil {
		return nil, result.Error
	}
	return &transaction, nil
}
