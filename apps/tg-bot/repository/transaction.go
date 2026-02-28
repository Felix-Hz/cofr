package repository

import (
	. "remind0/db"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type transactionRepository struct {
	dbClient *gorm.DB
}

type ITransactionRepository interface {
	Create(transaction []*Transaction) ([]*Transaction, error)
	Delete(transaction []*Transaction) error

	GetById(id uuid.UUID, userId uuid.UUID) (*Transaction, error)
	GetManyById(id []uuid.UUID, userId uuid.UUID) ([]*Transaction, error)
	GetByHash(hash string, userId uuid.UUID) (*Transaction, error)

	GetAll(userId uuid.UUID, timestamp time.Time, limit int) ([]*Transaction, error)
	GetManyByCategory(userId uuid.UUID, category string, timestamp time.Time, limit int) ([]*Transaction, error)
	GetManyByCurrency(userId uuid.UUID, currency string, fromTime time.Time, limit int) ([]*Transaction, error)
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

func (r *transactionRepository) GetById(id uuid.UUID, userId uuid.UUID) (*Transaction, error) {
	var transaction Transaction
	result := r.dbClient.Where("id = ? and user_id = ?", id, userId).First(&transaction)
	if result.Error != nil {
		return nil, result.Error
	}
	return &transaction, nil
}

func (r *transactionRepository) GetManyById(ids []uuid.UUID, userId uuid.UUID) ([]*Transaction, error) {
	var transactions []*Transaction
	result := r.dbClient.Where("id IN ? and user_id = ?", ids, userId).Find(&transactions)
	if result.Error != nil {
		return nil, result.Error
	}
	return transactions, nil
}

func (r *transactionRepository) GetByHash(hash string, userId uuid.UUID) (*Transaction, error) {
	var transaction Transaction
	result := r.dbClient.Where("hash = ? and user_id = ?", hash, userId).First(&transaction)
	if result.Error != nil {
		return nil, result.Error
	}
	return &transaction, nil
}

func (r *transactionRepository) GetAll(userId uuid.UUID, fromTime time.Time, limit int) ([]*Transaction, error) {

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

func (r *transactionRepository) GetManyByCategory(userId uuid.UUID, category string, fromTime time.Time, limit int) ([]*Transaction, error) {

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

func (r *transactionRepository) GetManyByCurrency(userId uuid.UUID, currency string, fromTime time.Time, limit int) ([]*Transaction, error) {

	var transactions []*Transaction

	result := r.dbClient.
		Where("currency = ? and user_id = ? and timestamp >= ? and timestamp < ?", currency, userId, fromTime, time.Now()).
		Order("timestamp DESC, id DESC").
		Limit(limit).
		Find(&transactions)

	if result.Error != nil {
		return nil, result.Error
	}

	return transactions, nil
}
