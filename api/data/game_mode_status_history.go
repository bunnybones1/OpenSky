package data

import (
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type GameModeStatusHistory struct {
	*proto.GameModeStatusHistory
}

func (g *GameModeStatusHistory) Store(sess db.Session) db.Store {
	return DB.GameModeStatusHistory(sess)
}

type GameModeStatusHistoryStore struct {
	db.Collection
}
