package tasks

import (
	"context"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/lib/rankup/grandmasters"
	"github.com/horizon-games/OpenSky/api/proto"
)

type MonthlyHardResetTask struct {
	grandmastersUpdater GrandmastersUpdater
}

func NewMonthlyHardResetTask() *MonthlyHardResetTask {
	return &MonthlyHardResetTask{
		grandmastersUpdater: grandmasters.NewUpdater(),
	}
}

func (w *MonthlyHardResetTask) Reset(ctx context.Context, sess db.Session, season uint16) error {
	gameModes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
	}

	// Save final score of past season before hard reset
	err := data.DB.AccountStats(sess).Find(db.Cond{
		"game_mode": db.AnyOf(gameModes),
		"season":    season,
	}).Update(db.Cond{
		"week4_score": db.Raw("score"),
	})
	if err != nil {
		return err
	}

	// retrieve MMR params
	mmrParams := []struct {
		RMax     *float64 `db:"rmax"`
		RMin     *float64 `db:"rmin"`
		GameMode uint32   `db:"game_mode"`
	}{}
	err = data.DB.AccountStats(sess).Find(db.Cond{
		"game_mode": db.AnyOf(gameModes),
		"season":    season,
		"status":    db.NotAnyOf(data.BannedStatuses),
	}).Select(
		db.Raw("MAX(player_rank_state[2]) AS rmax"),
		db.Raw("MIN(player_rank_state[2]) AS rmin"),
		"game_mode",
	).GroupBy(
		"game_mode",
	).All(&mmrParams)
	if err != nil {
		return err
	}

	rMaxMap := map[uint32]float64{}
	rMinMap := map[uint32]float64{}
	for _, param := range mmrParams {
		if param.RMax != nil {
			rMaxMap[param.GameMode] = *param.RMax
		}
		if param.RMin != nil {
			rMinMap[param.GameMode] = *param.RMin
		}
	}

	// Carry hard reset to next season
	for _, entry := range playerRank.PlayerRanksTable {
		if entry.HardResetValue <= 0 {
			continue
		}

		newRank := playerRank.LookupRankByScore(entry.HardResetValue)

		for _, gameMode := range gameModes {
			rMinInMode := rMinMap[uint32(gameMode)]
			rMaxInMode := rMaxMap[uint32(gameMode)]

			if rMinInMode < 1 {
				rMinInMode = 1
			}
			if rMaxInMode < 1 {
				rMaxInMode = ranking.DefaultGlicko_Rating
			}
			if rMaxInMode == rMinInMode {
				rMaxInMode = ranking.DefaultGlicko_Rating
				rMinInMode = 0
			}

			_, err := sess.SQL().Exec(`
			INSERT INTO account_stats (
				account_id,
				season,
				game_mode,
				player_rank,
				player_rank_stage,
				player_rank_state,
				score
			) SELECT
				account_id,
				season+1,
				game_mode,
				?,
				?,
				ARRAY[
					COALESCE(player_rank_state[1], -1),
					CASE WHEN player_rank_state[2] > 0 THEN ? + ((player_rank_state[2] - ?)/?) * ? ELSE ? END,
					LEAST(SQRT(POW(player_rank_state[3], 2) + POW(?, 2)), ?),
					?
				],
				?
			FROM account_stats
			WHERE
				game_mode = ?
				AND season = ?
				AND player_rank = ?
				AND player_rank_stage = ?
				AND status NOT IN ?
			ON CONFLICT (account_id, game_mode, season)
			DO UPDATE SET
				player_rank = EXCLUDED.player_rank,
				player_rank_stage = EXCLUDED.player_rank_stage,
				player_rank_state = EXCLUDED.player_rank_state,
				score = EXCLUDED.score
		`,
				newRank.Rank,
				newRank.Stage,

				// R'
				ranking.DefaultGlicko_Rating,
				ranking.DefaultGlicko_Rating/2,
				ranking.DefaultGlicko_Rating,
				rMinInMode,
				rMaxInMode-rMinInMode,

				// RD'
				ranking.DefaultGlicko_RDResetFactor,
				ranking.DefaultGlicko_RDInit,

				entry.HardResetValue, // RP
				entry.HardResetValue, // Score

				gameMode,
				season,
				entry.Rank,
				entry.Stage,
				data.BannedStatuses,
			)
			if err != nil {
				return err
			}
		}
	}

	// Set past season average score (average = P / Q)
	seasonStats := sess.SQL().Select(
		db.Raw(`
		(
			COALESCE(week1_score, 0)
			+ COALESCE(week2_score, 0)
			+ COALESCE(week3_score, 0)
			+ COALESCE(week4_score, 0)
		) AS P
	`),
		db.Raw(`
		(
			LEAST(COALESCE(week1_score, 0), 1)
			+ LEAST(COALESCE(week2_score, 0), 1)
			+ LEAST(COALESCE(week3_score, 0), 1)
			+ LEAST(COALESCE(week4_score, 0), 1)
		) AS Q
	`),
		"account_id",
		"game_mode",
		"season",
	).From(
		"account_stats",
	).Where(
		db.Cond{
			"game_mode": db.AnyOf(gameModes),
			"status":    db.NotAnyOf(data.BannedStatuses),
			"season":    season,
		},
	).GroupBy(
		"account_id",
		"season",
		"game_mode",
	)

	_, err = sess.SQL().Exec(`WITH season_stats as ?
	UPDATE
		account_stats
		SET
			score = CEIL(season_stats.P / season_stats.Q)
		FROM season_stats
		WHERE
			account_stats.account_id = season_stats.account_id
			AND account_stats.season = season_stats.season
			AND account_stats.game_mode = season_stats.game_mode
			AND Q > 0
	`, seasonStats,
	)
	if err != nil {
		return err
	}

	// reset grandweavers after recalculating score
	for _, gameMode := range gameModes {
		if err := w.grandmastersUpdater.Update(sess, gameMode, season); err != nil {
			return err
		}
		if err := w.grandmastersUpdater.Update(sess, gameMode, season+1); err != nil {
			return err
		}
	}

	return nil
}

type GrandmastersUpdater interface {
	Update(sess db.Session, gameMode proto.GameMode, season uint16) error
}
