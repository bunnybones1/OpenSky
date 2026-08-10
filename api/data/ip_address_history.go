package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type IPAddressHistory struct {
	*proto.IPAddressHistory
}

func (a *IPAddressHistory) Store(sess db.Session) db.Store {
	return DB.IPAddressHistories(sess)
}

type IPAddressHistoriesStore struct {
	db.Collection
}

func (s *IPAddressHistoriesStore) FindOne(conds ...interface{}) (*IPAddressHistory, error) {
	var IPAddressHistory IPAddressHistory
	err := s.Find(conds...).One(&IPAddressHistory)
	if err != nil {
		return nil, err
	}
	return &IPAddressHistory, nil
}
