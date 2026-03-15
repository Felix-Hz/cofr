package repository

import (
	. "remind0/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type accountRepository struct {
	dbClient *gorm.DB
}

type IAccountRepository interface {
	GetByUser(userID uuid.UUID) ([]Account, error)
	GetByID(id uuid.UUID, userID uuid.UUID) (*Account, error)
	GetBalances(userID uuid.UUID) ([]AccountBalance, error)
}

// Factory method to initialise an account repository.
func AccountRepositoryImpl(dbClient *gorm.DB) IAccountRepository {
	return &accountRepository{dbClient: dbClient}
}

func (r *accountRepository) GetByUser(userID uuid.UUID) ([]Account, error) {
	var accounts []Account
	result := r.dbClient.
		Where("user_id = ?", userID).
		Order("display_order ASC, created_at ASC").
		Find(&accounts)
	if result.Error != nil {
		return nil, result.Error
	}
	return accounts, nil
}

func (r *accountRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*Account, error) {
	var account Account
	result := r.dbClient.Where("id = ? AND user_id = ?", id, userID).First(&account)
	if result.Error != nil {
		return nil, result.Error
	}
	return &account, nil
}

func (r *accountRepository) GetBalances(userID uuid.UUID) ([]AccountBalance, error) {
	type balanceRow struct {
		AccountID   uuid.UUID
		AccountName string
		AccountType string
		Balance     float64
	}

	var rows []balanceRow
	err := r.dbClient.
		Table("accounts").
		Select(`
			accounts.id as account_id,
			accounts.name as account_name,
			accounts.type as account_type,
			COALESCE(SUM(
				CASE
					WHEN t.is_transfer = true AND t.transfer_direction = 'to' THEN t.amount
					WHEN t.is_transfer = true AND t.transfer_direction = 'from' THEN -t.amount
					WHEN c.type = 'income' THEN t.amount
					WHEN c.type = 'expense' THEN -t.amount
					ELSE 0
				END
			), 0) as balance
		`).
		Joins("LEFT JOIN transactions t ON t.account_id = accounts.id").
		Joins("LEFT JOIN categories c ON c.id = t.category_id").
		Where("accounts.user_id = ?", userID).
		Group("accounts.id, accounts.name, accounts.type").
		Order("accounts.display_order ASC, accounts.created_at ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	balances := make([]AccountBalance, len(rows))
	for i, row := range rows {
		balances[i] = AccountBalance{
			AccountID:   row.AccountID,
			AccountName: row.AccountName,
			AccountType: row.AccountType,
			Balance:     row.Balance,
		}
	}
	return balances, nil
}
