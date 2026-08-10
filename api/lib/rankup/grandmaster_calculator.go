package rankup

import (
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type GrandmastersRecalculator struct {
	updater GrandmasterUpdater
}

func NewGrandmastersRecalculator(updater GrandmasterUpdater) *GrandmastersRecalculator {
	return &GrandmastersRecalculator{
		updater: updater,
	}
}

func (c *GrandmastersRecalculator) Recalculate(sess db.Session, season uint16) error {
	gameModes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
	}

	for _, gameMode := range gameModes {
		if err := c.updater.Update(sess, gameMode, season); err != nil {
			return fmt.Errorf("update %s: %w", gameMode, err)
		}
	}

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/grandmasters_updater.go -package mock . GrandmasterUpdater
type GrandmasterUpdater interface {
	Update(sess db.Session, gameMode proto.GameMode, season uint16) error
}
