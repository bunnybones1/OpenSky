package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type UserAgentHistory struct {
	*proto.UserAgentHistory
}

func (a *UserAgentHistory) Store(sess db.Session) db.Store {
	return DB.UserAgentHistories(sess)
}

type UserAgentHistoriesStore struct {
	db.Collection
}

func (s *UserAgentHistoriesStore) FindOne(conds ...interface{}) (*UserAgentHistory, error) {
	var UserAgentHistory UserAgentHistory
	err := s.Find(conds...).One(&UserAgentHistory)
	if err != nil {
		return nil, err
	}
	return &UserAgentHistory, nil
}
