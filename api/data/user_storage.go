package data

import (
	"errors"
	"strings"
	"time"

	"github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/postgresql"

	"github.com/horizon-games/OpenSky/api/proto"
)

type UserStorage struct {
	AccountID   proto.AccountID  `json:"-" db:"account_id,omitempty"`
	UserAddress proto.Hash       `json:"-"`
	Key         string           `json:"-" db:"key"`
	Object      postgresql.JSONB `json:"-" db:"object"`
	UpdatedAt   *time.Time       `json:"-" db:"created_at,omitempty"`
	CreatedAt   *time.Time       `json:"-" db:"updated_at,omitempty"`
}

func (s *UserStorage) Store(sess db.Session) db.Store {
	return DB.UsersStorage(sess)
}

func (s *UserStorage) Validate() error {
	if s.Key == "" {
		return errors.New("key cannot be emptyu")
	}
	s.Key = strings.ToLower(s.Key)
	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &UserStorage{}
)

type UserStorageStore struct {
	db.Collection
}

func (s *UserStorageStore) FindKey(accountID proto.AccountID, key string) (*UserStorage, error) {
	var userStorage *UserStorage
	err := s.Find(db.Cond{
		"account_id": accountID,
		"key":        key,
	}).One(&userStorage)
	return userStorage, err
}

func (s *UserStorageStore) FindAllKeys(accountID proto.AccountID, keys []string) ([]*UserStorage, error) {
	cond := db.And(db.Cond{"account_id": accountID})
	if len(keys) > 0 {
		cond = cond.And(db.Cond{"key": db.AnyOf(keys)})
	}

	var userStorage []*UserStorage
	err := s.Find(cond).All(&userStorage)
	return userStorage, err
}

func (s *UserStorageStore) DeleteKey(accountID proto.AccountID, key string) error {
	err := s.Find(db.Cond{
		"account_id": accountID,
		"key":        key,
	}).Delete()
	return err
}
