package repository

import (
	. "remind0/db"
	"time"

	"gorm.io/gorm"
)

type transactionRepository struct {
	dbClient *gorm.DB
}

type ITransactionRepository interface {
	Create(transaction []*Transaction) ([]*Transaction, error)
	Delete(transaction []*Transaction) error

	GetById(id int64, userId uint) (*Transaction, error)
	GetManyById(id []int64, userId uint) ([]*Transaction, error)
	GetByHash(hash string, userId uint) (*Transaction, error)

	GetAll(userId uint, timestamp time.Time, limit int) ([]*Transaction, error)
	GetManyByCategory(userId uint, category string, timestamp time.Time, limit int) ([]*Transaction, error)
}

// Factory method to initialise a repository.
func TransactionRepositoryImpl(dbClient *gorm.DB) ITransactionRepository {
	return &transactionRepository{dbClient: dbClient}
}

func (r *transactionRepository) Create(txs []*Transaction) ([]*Transaction, error) {
	result := r.dbClient.Create(&txs)
	if result.Error != nil {
		return nil, result.Error
	}
	return txs, nil
}

func (r *transactionRepository) Delete(txs []*Transaction) error {
	result := r.dbClient.Delete(&txs)
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

func (r *transactionRepository) GetManyById(ids []int64, userId uint) ([]*Transaction, error) {
	var transactions []*Transaction
	result := r.dbClient.Where("id IN ? and user_id = ?", ids, userId).Find(&transactions)
	if result.Error != nil {
		return nil, result.Error
	}
	return transactions, nil
}

func (r *transactionRepository) GetByHash(hash string, userId uint) (*Transaction, error) {
	var transaction Transaction
	result := r.dbClient.Where("hash = ? and user_id = ?", hash, userId).First(&transaction)
	if result.Error != nil {
		return nil, result.Error
	}
	return &transaction, nil
}

func (r *transactionRepository) GetAll(userId uint, fromTime time.Time, limit int) ([]*Transaction, error) {

	var transactions []*Transaction

	result := r.dbClient.
		Where("user_id = ? and timestamp >= ? and timestamp < ?", userId, fromTime, time.Now()).
		Order("timestamp DESC, id DESC").
		Limit(limit).
		Find(&transactions)

	if result.Error != nil {
		return nil, result.Error
	}

	return transactions, nil
}

func (r *transactionRepository) GetManyByCategory(userId uint, category string, fromTime time.Time, limit int) ([]*Transaction, error) {

	var transactions []*Transaction

	result := r.dbClient.
		Where("category = ? and user_id = ? and timestamp >= ? and timestamp < ?", category, userId, fromTime, time.Now()).
		Order("timestamp DESC, id DESC").
		Limit(limit).
		Find(&transactions)

	if result.Error != nil {
		return nil, result.Error
	}

	return transactions, nil
}
