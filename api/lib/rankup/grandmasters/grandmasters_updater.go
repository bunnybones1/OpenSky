package grandmasters

import (
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type GrandmasterListerUpdater struct {
}

func NewUpdater() *GrandmasterListerUpdater {
	return &GrandmasterListerUpdater{}
}

func (u *GrandmasterListerUpdater) List(sess db.Session, gameMode proto.GameMode, season uint16) ([]*data.AccountStat, []*data.AccountStat, error) {
	// find top players (grandmasters and top master)
	var stats []*data.AccountStat
	err := data.DB.AccountStats(sess).Find(db.Cond{
		"game_mode":   gameMode,
		"season":      season,
		"player_rank": db.In(proto.PlayerRank_MASTER, proto.PlayerRank_GRANDWEAVER),
		"status":      db.NotAnyOf(data.BannedStatuses),
	}).OrderBy(
		"-score",
		"updated_at",
		"account_id",
	).All(&stats)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to find top players: %w", err)
	}

	grandmasters, masters := []*data.AccountStat{}, []*data.AccountStat{}
	for i := range stats {
		if i < data.GrandMasterCount {
			grandmasters = append(grandmasters, stats[i])
		} else {
			masters = append(masters, stats[i])
		}
	}

	return grandmasters, masters, nil
}

func (u *GrandmasterListerUpdater) Update(sess db.Session, gameMode proto.GameMode, season uint16) error {
	// find top players (grandmasters and top master)
	grandmasters, _, err := u.List(sess, gameMode, season)
	if err != nil {
		return err
	}

	accountIDs := []proto.AccountID{}
	for _, gm := range grandmasters {
		accountIDs = append(accountIDs, gm.AccountID)
	}

	// reset grandmasters
	err = data.DB.AccountStats(sess).Find(db.Cond{
		"game_mode":   gameMode,
		"season":      season,
		"status":      db.NotAnyOf(data.BannedStatuses),
		"player_rank": db.In(proto.PlayerRank_MASTER, proto.PlayerRank_GRANDWEAVER),
	}).Update(db.Cond{
		"player_rank": proto.PlayerRank_MASTER,
	})
	if err != nil {
		return fmt.Errorf("failed to reset masters: %w", err)
	}

	// promote grandmasters from previously computed list
	err = data.DB.AccountStats(sess).Find(db.Cond{
		"game_mode":   gameMode,
		"season":      season,
		"account_id":  db.AnyOf(accountIDs),
		"player_rank": db.In(proto.PlayerRank_MASTER, proto.PlayerRank_GRANDWEAVER),
	}).Update(db.Cond{
		"player_rank": proto.PlayerRank_GRANDWEAVER,
	})
	if err != nil {
		return fmt.Errorf("failed to set grandmasters: %w", err)
	}

	return nil
}
