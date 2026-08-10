package custommatchmaker

import (
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
)

const (
	gameModeLockStoreIDFmt = "mm_queue:%s.lock"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/game_mode_locker.go -package mock . GameModeLocker
type GameModeLocker interface {
	Locker(proto.GameMode) lock.Mutex
}

type gameModeLocker struct {
	locker lock.Locker
}

func NewGameModeLocker(locker lock.Locker) *gameModeLocker {
	return &gameModeLocker{
		locker: locker,
	}
}

func (l *gameModeLocker) Locker(gameMode proto.GameMode) lock.Mutex {
	return l.locker.New(l.gameModeLockStoreID(gameMode))
}

func (l *gameModeLocker) gameModeLockStoreID(gameMode proto.GameMode) string {
	return fmt.Sprintf(gameModeLockStoreIDFmt, gameMode)
}
