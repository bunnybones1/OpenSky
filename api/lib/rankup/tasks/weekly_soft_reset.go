package tasks

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/api/data"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/lib/rankup/grandmasters"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type WeeklySoftResetTask struct {
	grandmastersUpdater GrandmastersUpdater
}

func NewWeeklySoftResetTask() *WeeklySoftResetTask {
	return &WeeklySoftResetTask{
		grandmastersUpdater: grandmasters.NewUpdater(),
	}
}

func (w *WeeklySoftResetTask) Reset(ctx context.Context, sess db.Session, season uint16, week uint8) error {
	if week >= 4 {
		return fmt.Errorf("soft reset can only be run before the 4th week of the season")
	}

	gameModes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
	}

	weekColumn := fmt.Sprintf("week%d_score", week)

	// Save weekly score before soft reset
	err := data.DB.AccountStats(sess).Find(db.Cond{
		"season":    season,
		"game_mode": db.AnyOf(gameModes),
	}).Update(db.Cond{
		weekColumn: db.Raw("score"),
	})
	if err != nil {
		return err
	}

	for _, entry := range playerRank.PlayerRanksTable {
		if entry.SoftResetValue <= 0 {
			continue
		}
		_, err = sess.SQL().Exec(`
			UPDATE account_stats
			SET
				score = ?,
				player_rank_state[4] = ?
			WHERE
				game_mode IN ?
				AND season = ?
				AND player_rank = ?
				AND player_rank_stage = ?
				AND player_rank_state IS NOT NULL
				AND score >= ?
		`,
			entry.SoftResetValue,
			entry.SoftResetValue,
			gameModes,
			season,
			entry.Rank,
			entry.Stage,
			entry.SoftResetValue,
		)
		if err != nil {
			return err
		}
	}

	// update RD
	_, err = sess.SQL().Exec(`
		UPDATE account_stats
		SET
			player_rank_state[3] = LEAST(SQRT(POW(player_rank_state[3], 2) + POW(?, 2)), ?)
		WHERE
			season = ?
			AND game_mode IN ?
			AND player_rank_state IS NOT NULL
	`,
		// RD'
		ranking.DefaultGlicko_RDResetFactor,
		ranking.DefaultGlicko_RDInit,

		season,
		gameModes,
	)
	if err != nil {
		return nil
	}

	for _, gameMode := range gameModes {
		if err := w.grandmastersUpdater.Update(sess, gameMode, season); err != nil {
			return err
		}
	}

	return nil
}
