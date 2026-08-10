package data

import (
	"errors"
	"fmt"
	"sort"

	db "github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/lib/levels"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/lib/rewards"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	ArcRewardAmount uint = 100

	// NOTE: If you change this constant, you must change /lib/shared/src/constants.ts as well.
	GrandMasterCount = 100
)

type AccountStatsStore struct {
	db.Collection
}

// findOne returns one of the account stats that match the given conditions.
// it's not exported, because it doesn't require season
func (s *AccountStatsStore) findOne(conds ...interface{}) (*AccountStat, error) {
	var stats AccountStat

	err := s.Find(conds...).Limit(1).One(&stats)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// FindByAccountID returns the account stats for given season.
func (s *AccountStatsStore) FindByAccountID(accountID proto.AccountID, season uint16) ([]*AccountStat, error) {
	var stats []*AccountStat
	err := s.Find(db.Cond{
		"account_id": accountID,
		"season":     season,
	}).All(&stats)

	return stats, err
}

func (s *AccountStatsStore) FindByAccountIDAllSeasons(accountID proto.AccountID) ([]*AccountStat, error) {
	seasons := []uint16{}
	for season := uint16(1); season <= CurrentSeason(); season++ {
		seasons = append(seasons, season)
	}
	return s.FindByAccountIDAndSeasons(accountID, seasons)
}

func (s *AccountStatsStore) FindByAccountIDAndSeasons(accountID proto.AccountID, seasons []uint16) ([]*AccountStat, error) {
	// This is used by GetAccountStats to calculate ranks, so this one has to be
	// filtered out by status.
	var stats []*AccountStat
	err := s.Find(db.Cond{
		"account_id": accountID,
		"season":     db.AnyOf(seasons),
		"status":     db.NotAnyOf(BannedStatuses),
	}).All(&stats)

	seen := map[uint16]map[proto.GameMode]bool{}
	for _, stat := range stats {
		if seen[*stat.Season] == nil {
			seen[*stat.Season] = map[proto.GameMode]bool{}
		}
		seen[*stat.Season][stat.GameMode] = true
	}

	for _, season := range seasons {
		for _, gameMode := range BaseGameModes {
			if seen[season][gameMode] {
				continue
			}
			stat := &AccountStat{
				&proto.AccountStat{
					AccountID:       accountID,
					GameMode:        gameMode,
					PlayerRank:      proto.PlayerRank_UNRANKED,
					PlayerRankStage: proto.PlayerRankStage_STAGE_NONE,
					Season:          new(uint16),
					Status:          proto.AccountStatus_ACTIVE,
				},
			}
			*stat.Season = season

			stats = append(stats, stat)
		}
	}

	sort.Slice(stats, func(i, j int) bool {
		switch {
		case *stats[i].Season < *stats[j].Season:
			return true
		case *stats[i].Season == *stats[j].Season:
			return stats[i].GameMode < stats[j].GameMode
		}
		return false
	})

	return stats, err
}

func (s *AccountStatsStore) FindByAccountIDAndMode(accountID proto.AccountID, mode proto.GameMode, season uint16) (*AccountStat, error) {
	return s.findOne(db.Cond{
		"account_id": accountID,
		"game_mode":  mode,
		"season":     season,
	})
}

// FindActiveByAccountIDAndMode returns the active account stats with the given game mode.
func (s *AccountStatsStore) FindActiveByAccountIDAndMode(accountID proto.AccountID, mode proto.GameMode, season uint16) (*AccountStat, error) {
	return s.findOne(db.Cond{
		"account_id": accountID,
		"game_mode":  mode,
		"season":     season,
		"status":     db.NotAnyOf(BannedStatuses),
	})
}

// FindOrCreateByAccountIDAndMode returns the account stats with the given and game mode.
func (s *AccountStatsStore) FindOrCreateByAccountIDAndMode(accountID proto.AccountID, mode proto.GameMode, season uint16) (*AccountStat, error) {
	switch mode {
	case proto.GameMode_RANKED_CONSTRUCTED, proto.GameMode_RANKED_DISCOVERY, proto.GameMode_CONQUEST_CONSTRUCTED, proto.GameMode_CONQUEST_DISCOVERY:
		// continue
	default:
		// other game modes are not saved
		return &AccountStat{
			AccountStat: &proto.AccountStat{
				AccountID: accountID,
				GameMode:  mode,
				Season:    &season,
				Score:     new(int32),
			},
		}, nil
	}

	stat, err := s.findOne(db.Cond{
		"account_id": accountID,
		"game_mode":  mode,
		"season":     season,
	})
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find one: %w", err)
	}

	if stat != nil {
		return stat, nil
	}

	stat = &AccountStat{
		AccountStat: &proto.AccountStat{
			AccountID: accountID,
			GameMode:  mode,
			Season:    &season,
		},
	}

	// there's no information for this season yet, use a clean score
	if mode == proto.GameMode_RANKED_CONSTRUCTED || mode == proto.GameMode_RANKED_DISCOVERY {
		account, err := DB.Accounts(s.Session()).FindByID(accountID)
		if err != nil {
			return nil, err
		}

		xp, err := DB.Items(s.Session()).GetXP(accountID)
		if err != nil {
			return nil, fmt.Errorf("get xp: %w", err)
		}

		totalExperience := levels.TotalExperience(account.Level, xp)
		initialRank := playerRank.LookupRankByScoreAndXP(0, int32(totalExperience))
		initialRankState := ranking.InitialRankState()

		stat.Score = &initialRankState.RP
		stat.PlayerRank = initialRank.Rank
		stat.PlayerRankStage = initialRank.Stage
		stat.PlayerRankState = proto.RankState{State: *initialRankState}
	}

	if err := s.Session().Save(stat); err != nil {
		return nil, fmt.Errorf("save account stats: %w", err)
	}

	return stat, nil
}

func (s *AccountStatsStore) GetGamesPlayed(accountID proto.AccountID, season uint16) (uint32, error) {
	accountStats, err := s.FindByAccountID(accountID, season)
	if err != nil {
		if errors.Is(err, db.ErrNoMoreRows) {
			return 0, nil
		}
		return 0, fmt.Errorf("find by id: %w", err)
	}

	var gamesPlayed uint32
	for _, st := range accountStats {
		gamesPlayed = gamesPlayed + uint32(st.WinCount+st.LossCount+st.TieCount)
	}

	return gamesPlayed, nil
}

func (s *AccountStatsStore) CountRanks(gameMode proto.GameMode, playerRank proto.PlayerRank, season uint16) (uint64, error) {
	return s.Find(db.Cond{
		"season":      season,
		"game_mode":   gameMode,
		"player_rank": playerRank,
		"status":      db.NotAnyOf(BannedStatuses),
	}).Count()
}

func (s *AccountStatsStore) GetRanks(gameMode proto.GameMode, accountIDs []proto.AccountID, season uint16) (map[proto.AccountID]uint32, error) {
	if len(accountIDs) == 0 {
		return nil, nil
	}

	// This query gets rank positions for all players below master.
	// Players that are master or above are all considered "master".
	var ranks []*proto.AccountStat
	err := s.Session().SQL().Select("targets.*",
		db.Raw(`(
			SELECT
				COUNT(1)
			FROM account_stats above
			WHERE
				(
					(targets.player_rank < ? AND above.player_rank = targets.player_rank)
					OR (targets.player_rank >= ? AND above.player_rank >= targets.player_rank)
				)
				AND above.game_mode = targets.game_mode
				AND above.season = targets.season
				AND above.status NOT IN ?
				AND (
					above.score > targets.score
					OR (
						above.score = targets.score
						AND above.updated_at < targets.updated_at
					)
					OR (
						above.score = targets.score
						AND above.updated_at = targets.updated_at
						AND above.account_id < targets.account_id
					)
					OR (
						above.account_id = targets.account_id
					)
				)
			) AS rank
		`,
			proto.PlayerRank_MASTER,
			proto.PlayerRank_MASTER,
			BannedStatuses,
		),
		db.Raw(`(
			CASE
				WHEN targets.player_rank >= ?
				THEN
					CAST(? AS SMALLINT)
				ELSE
					targets.player_rank
			END
		) AS player_rank
		`,
			proto.PlayerRank_MASTER,
			proto.PlayerRank_MASTER,
		),
	).
		From("account_stats targets").
		Where(
			db.Cond{
				"game_mode":  gameMode,
				"account_id": db.AnyOf(accountIDs),
				"season":     season,
				"status":     db.NotAnyOf(BannedStatuses),
			},
		).All(&ranks)
	if err != nil {
		return nil, err
	}

	resp := make(map[proto.AccountID]uint32, len(ranks))
	for _, r := range ranks {
		if r.PlayerRank == proto.PlayerRank_MASTER {
			// master players who have ranks within GrandMasterCount are promoted to
			// grandweavers before returning the result.
			if *r.Rank <= GrandMasterCount {
				r.PlayerRank = proto.PlayerRank_GRANDWEAVER
			} else {
				// Adjust ranks for master players.
				*r.Rank = *r.Rank - GrandMasterCount
			}
		}
		resp[r.AccountID] = uint32(*r.Rank)
	}

	return resp, nil
}

func (s *AccountStatsStore) GetRankedCardRewards(mode proto.GameMode, season uint16) (map[proto.AccountID]uint, map[proto.AccountID]uint, map[proto.AccountID]int, error) {
	var ranks []*proto.AccountStat
	err := s.Find(db.Cond{
		"game_mode": mode,
		"season":    season,
		"status":    db.NotAnyOf(BannedStatuses),
	}).
		OrderBy(
			"-score",
			"-created_at",
		).
		Limit(int(rewards.RewardedRanksCount())).
		All(&ranks)

	if err != nil {
		return nil, nil, nil, err
	}

	rankSilverRewards := rewards.SilverRewards()
	rankTicketRewards := rewards.TicketRewards()
	accountSilverRewards := make(map[proto.AccountID]uint, rewards.RewardedRanksCount())
	accountTicketRewards := make(map[proto.AccountID]uint, rewards.RewardedRanksCount())
	accountRanks := make(map[proto.AccountID]int, rewards.RewardedRanksCount())

	for i, r := range ranks {
		accountSilverRewards[r.AccountID] = rankSilverRewards[uint(i+1)]
		accountTicketRewards[r.AccountID] = rankTicketRewards[uint(i+1)]
		accountRanks[r.AccountID] = i + 1
	}

	return accountSilverRewards, accountTicketRewards, accountRanks, nil
}

func (a *AccountStatsStore) Create(record db.Record) error {
	sess := a.Session()

	// There was a race condition problem which couldn't be solved with a simple
	// transaction. The problem was that sometimes a query that is right before
	// this insertion took a long time, and that caused concurrent transactions
	// to fail. The data was intact and it was technically correct for all
	// concurrent transactions but one to fail, but it caused a nasty error
	// message for the user.
	row, err := sess.SQL().InsertInto("account_stats").Values(record).Amend(func(s string) string {
		// We don't want to trigger the account_stats_pkey or
		// account_stats_address_mode_idx constraints, but any other constraint
		// should raise a failure. In any case, we want the account_id,
		// game_mode and season values to be returned so we can fetch fresh values
		// from the database. The UPDATE operation is a no-operation on this
		// context, nothing will change, but that is required for the RETURNING to
		// return the values we need.
		return s + `
			ON CONFLICT (account_id, game_mode, season)
			DO UPDATE
				SET
					account_id = EXCLUDED.account_id
			RETURNING account_id, game_mode, season
		`
	}).QueryRow()
	if err != nil {
		return err // an actual database failure
	}

	var accountID proto.AccountID
	var mode uint32
	var season uint16

	if err := row.Scan(&accountID, &mode, &season); err != nil {
		return err
	}

	err = sess.Get(record, db.Cond{
		"account_id": accountID,
		"game_mode":  mode,
		"season":     season,
	})

	return err
}
