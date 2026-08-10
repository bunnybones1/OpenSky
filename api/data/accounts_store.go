package data

import (
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

// AccountsStore represents an account set.
type AccountsStore struct {
	db.Collection
}

// FindOne returns one of the accounts that match the given conditions.
func (s *AccountsStore) FindOne(conds ...interface{}) (*Account, error) {
	var account Account

	err := s.Find(conds...).One(&account)
	if err != nil {
		return nil, err
	}

	return &account, nil
}

func (s *AccountsStore) FindByID(id proto.AccountID) (*Account, error) {
	return s.FindOne(db.Cond{"id": id})
}

// FindByAddress returns the account with the given address.
func (s *AccountsStore) FindByAddress(address proto.Hash) (*Account, error) {
	return s.FindOne(db.Cond{"address": address})
}

func (s *AccountsStore) AccountExists(address proto.Hash) (bool, bool, error) {
	account, err := s.FindByAddress(address)
	if err != nil && err != db.ErrNoMoreRows {
		return false, false, err
	}
	if account != nil {
		pendingMigration := account.OldAddress != nil && account.Address == *account.OldAddress
		return true, pendingMigration, nil
	}
	return false, false, nil
}

// FindByName returns the account with the given username name.
func (s *AccountsStore) FindByName(name string) (*Account, error) {
	return s.FindOne(db.Raw("lower(name) = lower(?)", name))
}

func (s *AccountsStore) AccountExistsByName(name string) (bool, bool, error) {
	account, err := s.FindByName(name)
	if err != nil && err != db.ErrNoMoreRows {
		return false, false, err
	}
	if account != nil {
		pendingMigration := account.OldAddress != nil && account.Address == *account.OldAddress
		return true, pendingMigration, nil
	}
	return false, false, nil
}

func (s *AccountsStore) UpdateLevel(accountID proto.AccountID, level uint16) error {
	result, err := s.Session().SQL().Exec(`
		UPDATE accounts 
		SET level = ?
		WHERE id = ?`,
		level, accountID)
	if err != nil {
		return fmt.Errorf("update level: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("account %d does not exist", accountID)
	}

	return nil
}

var _ = interface {
	db.Store
}(&AccountsStore{})
