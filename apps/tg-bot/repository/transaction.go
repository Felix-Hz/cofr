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
	Update(tx *Transaction) error
	Delete(transaction []*Transaction) error

	GetById(id uuid.UUID, userId uuid.UUID) (*Transaction, error)
	GetManyById(id []uuid.UUID, userId uuid.UUID) ([]*Transaction, error)
	GetByHash(hash string, userId uuid.UUID) (*Transaction, error)

	GetAll(userId uuid.UUID, timestamp time.Time, limit int) ([]*Transaction, error)
	GetRecent(userId uuid.UUID, limit int) ([]*Transaction, error)
	GetSummary(userId uuid.UUID, from time.Time, to time.Time) (*SummaryResult, error)
	GetManyByCategory(userId uuid.UUID, categoryID uuid.UUID, timestamp time.Time, limit int) ([]*Transaction, error)
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
	// Preload category and account for display
	ids := make([]uuid.UUID, len(txs))
	for i, tx := range txs {
		ids[i] = tx.ID
	}
	r.dbClient.Preload("CategoryRel").Preload("AccountRel").Where("id IN ?", ids).Find(&txs)
	return txs, nil
}

func (r *transactionRepository) Delete(txs []*Transaction) error {
	// Collect linked transaction IDs for transfer pairs
	var linkedIDs []uuid.UUID
	for _, tx := range txs {
		if tx.LinkedTransactionID != nil {
			linkedIDs = append(linkedIDs, *tx.LinkedTransactionID)
		}
	}

	return r.dbClient.Transaction(func(dbTx *gorm.DB) error {
		// Clear linked_transaction_id references to avoid FK issues
		allIDs := make([]uuid.UUID, len(txs))
		for i, tx := range txs {
			allIDs[i] = tx.ID
		}
		allIDs = append(allIDs, linkedIDs...)

		if len(allIDs) > 0 {
			if err := dbTx.Model(&Transaction{}).
				Where("linked_transaction_id IN ?", allIDs).
				Update("linked_transaction_id", nil).Error; err != nil {
				return err
			}
		}

		// Delete the primary transactions
		if err := dbTx.Delete(&txs).Error; err != nil {
			return err
		}

		// Delete linked transactions (transfer pairs)
		if len(linkedIDs) > 0 {
			if err := dbTx.Where("id IN ?", linkedIDs).Delete(&Transaction{}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *transactionRepository) GetById(id uuid.UUID, userId uuid.UUID) (*Transaction, error) {
	var transaction Transaction
	result := r.dbClient.Preload("CategoryRel").Preload("AccountRel").Where("id = ? and user_id = ?", id, userId).First(&transaction)
	if result.Error != nil {
		return nil, result.Error
	}
	return &transaction, nil
}

func (r *transactionRepository) GetManyById(ids []uuid.UUID, userId uuid.UUID) ([]*Transaction, error) {
	var transactions []*Transaction
	result := r.dbClient.Preload("CategoryRel").Preload("AccountRel").Where("id IN ? and user_id = ?", ids, userId).Find(&transactions)
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
		Preload("CategoryRel").
		Preload("AccountRel").
		Where("user_id = ? and timestamp >= ? and timestamp < ?", userId, fromTime, time.Now()).
		Order("timestamp DESC, id DESC").
		Limit(limit).
		Find(&transactions)

	if result.Error != nil {
		return nil, result.Error
	}

	return transactions, nil
}

func (r *transactionRepository) GetManyByCategory(userId uuid.UUID, categoryID uuid.UUID, fromTime time.Time, limit int) ([]*Transaction, error) {

	var transactions []*Transaction

	result := r.dbClient.
		Preload("CategoryRel").
		Preload("AccountRel").
		Where("category_id = ? and user_id = ? and timestamp >= ? and timestamp < ?", categoryID, userId, fromTime, time.Now()).
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
		Preload("CategoryRel").
		Preload("AccountRel").
		Where("currency = ? and user_id = ? and timestamp >= ? and timestamp < ?", currency, userId, fromTime, time.Now()).
		Order("timestamp DESC, id DESC").
		Limit(limit).
		Find(&transactions)

	if result.Error != nil {
		return nil, result.Error
	}

	return transactions, nil
}

func (r *transactionRepository) Update(tx *Transaction) error {
	return r.dbClient.Save(tx).Error
}

func (r *transactionRepository) GetRecent(userId uuid.UUID, limit int) ([]*Transaction, error) {
	var transactions []*Transaction
	result := r.dbClient.
		Preload("CategoryRel").
		Preload("AccountRel").
		Where("user_id = ?", userId).
		Order("timestamp DESC, id DESC").
		Limit(limit).
		Find(&transactions)
	if result.Error != nil {
		return nil, result.Error
	}
	return transactions, nil
}

func (r *transactionRepository) GetSummary(userId uuid.UUID, from time.Time, to time.Time) (*SummaryResult, error) {
	type categoryRow struct {
		CategoryName string
		CategoryType string
		Total        float64
		Count        int
	}

	var rows []categoryRow
	err := r.dbClient.
		Table("transactions").
		Select("categories.name as category_name, categories.type as category_type, SUM(transactions.amount) as total, COUNT(*) as count").
		Joins("JOIN categories ON categories.id = transactions.category_id").
		Where("transactions.user_id = ? AND transactions.timestamp >= ? AND transactions.timestamp < ? AND transactions.is_transfer = false", userId, from, to).
		Group("categories.name, categories.type").
		Order("total DESC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := &SummaryResult{}
	for _, row := range rows {
		result.TxCount += row.Count
		result.ByCategory = append(result.ByCategory, CategorySummary{
			CategoryName: row.CategoryName,
			CategoryType: row.CategoryType,
			Total:        row.Total,
			Count:        row.Count,
		})
		switch row.CategoryType {
		case "income":
			result.TotalIncome += row.Total
		case "expense":
			result.TotalExpense += row.Total
		}
	}

	return result, nil
}
