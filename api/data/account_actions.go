package data

import (
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type AccountAction struct {
	*proto.AccountAction
}

func (a *AccountAction) Store(sess db.Session) db.Store {
	return DB.AccountActions(sess)
}

type AccountActionsStore struct {
	db.Collection
}

func (s *AccountActionsStore) FindOne(conds ...interface{}) (*AccountAction, error) {
	var accountAction AccountAction
	err := s.Find(conds...).One(&accountAction)
	if err != nil {
		return nil, err
	}
	return &accountAction, nil
}

func (s *AccountActionsStore) FindActive(accountID proto.AccountID) ([]*AccountAction, error) {
	var actions []*AccountAction
	err := s.Find(
		db.And(
			db.Cond{
				"account_id": accountID,
				"is_active":  true,
			},
			db.Raw("expires_at > NOW()"),
		)).
		All(&actions)
	if err != nil {
		return nil, err
	}

	return actions, nil
}
