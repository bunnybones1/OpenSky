package data

import (
	"errors"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type GameModeStatus struct {
	*proto.GameModeStatus
}

func (g *GameModeStatus) Store(sess db.Session) db.Store {
	return DB.GameModeStatus(sess)
}

type GameModeStatusStore struct {
	db.Collection
}

func (s GameModeStatusStore) GetStatus(mode proto.GameMode) (bool, error) {
	var status *GameModeStatus

	err := s.Find(db.Cond{"game_mode": mode}).One(&status)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return false, fmt.Errorf("find game mode status: %w", err)
	}

	if status != nil {
		return status.Enabled, nil
	}

	return true, nil
}

func (s GameModeStatusStore) CheckStatuses(modes ...*proto.GameMode) (bool, error) {
	statuses := map[proto.GameMode]bool{}
	for _, mode := range modes {
		if mode == nil {
			return false, fmt.Errorf("missing game mode")
		}
		statuses[*mode] = true
	}
	for mode := range statuses {
		enabled, err := s.GetStatus(mode)
		if !enabled || err != nil {
			return enabled, err
		}
	}

	return true, nil
}
