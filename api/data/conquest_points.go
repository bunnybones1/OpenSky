package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type ConquestPoints struct {
	*proto.ConquestPoints
}

func (s *ConquestPoints) Store(sess db.Session) db.Store {
	return DB.ConquestPoints(sess)
}

var (
	_ interface {
		db.Record
	} = &ConquestPoints{}
)
