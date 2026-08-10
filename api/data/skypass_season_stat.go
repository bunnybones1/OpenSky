package data

import (
	"errors"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type SkypassSeasonStat struct {
	AccountID            proto.AccountID `db:"account_id"`
	Season               uint16          `db:"season"`
	InitialAccountLevel  uint16          `db:"initial_account_level"`
	AchievedAccountLevel uint16          `db:"achieved_account_level"`
	HasPremium           bool            `db:"has_premium"`
	AutoClaimed          bool            `db:"autoclaimed"`
}

func (s *SkypassSeasonStat) Store(sess db.Session) db.Store {
	return DB.SkypassSeasonStats(sess)
}

func (s *SkypassSeasonStat) Validate() error {
	return nil
}

func (s *SkypassSeasonStat) LevelProgress() uint16 {
	return s.AchievedAccountLevel - s.InitialAccountLevel
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &SkypassSeasonStat{}
)

type SkypassSeasonStatsStore struct {
	db.Collection
}

func (s *SkypassSeasonStatsStore) FindOrCreate(accountID proto.AccountID, season uint16) (*SkypassSeasonStat, error) {
	var stat *SkypassSeasonStat

	err := s.Find(db.Cond{
		"account_id": accountID,
		"season":     season,
	}).One(&stat)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find skypass season stat: %w", err)
	}

	if stat != nil {
		return stat, nil
	}

	account, err := DB.Accounts(s.Session()).FindByID(accountID)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find account: %w", err)
	}

	if account == nil {
		return nil, fmt.Errorf("account %q does not exist", accountID)
	}

	stat = &SkypassSeasonStat{
		AccountID: accountID,
		Season:    season,
	}

	if season == CurrentSeason() {
		stat.InitialAccountLevel = account.Level
		stat.AchievedAccountLevel = account.Level
	}

	return stat, nil
}

func (s *SkypassSeasonStatsStore) SetPremium(accountID proto.AccountID, season uint16) error {
	result, err := s.Session().SQL().Exec(`
UPDATE skypass_season_stats 
SET has_premium = true
WHERE account_id = ? 
  AND season = ?`,
		accountID, season)
	if err != nil {
		return fmt.Errorf("update stats: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}

	if rowsAffected == 1 {
		return nil
	}

	stats, err := s.FindOrCreate(accountID, season)
	if err != nil {
		return fmt.Errorf("find or create stats: %w", err)
	}

	stats.HasPremium = true

	if err := s.Session().Save(stats); err != nil {
		return fmt.Errorf("save new stats: %w", err)
	}

	return nil
}

func (s *SkypassSeasonStatsStore) UnsetPremium(accountID proto.AccountID, season uint16) error {
	_, err := s.Session().SQL().Exec(`
UPDATE skypass_season_stats 
SET has_premium = false
WHERE account_id = ? 
  AND season = ?`,
		accountID, season)
	if err != nil {
		return fmt.Errorf("update stats: %w", err)
	}

	return nil
}

func (s *SkypassSeasonStatsStore) UpdateProgress(accountID proto.AccountID, season uint16, level uint16) error {
	result, err := s.Session().SQL().Exec(`
UPDATE skypass_season_stats 
SET achieved_account_level = ?
WHERE account_id = ? 
  AND season = ?`,
		level, accountID, season)
	if err != nil {
		return fmt.Errorf("update stats: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}

	if rowsAffected == 1 {
		return nil
	}

	stats, err := s.FindOrCreate(accountID, season)
	if err != nil {
		return fmt.Errorf("find or create stats: %w", err)
	}

	stats.AchievedAccountLevel = level

	if err := s.Session().Save(stats); err != nil {
		return fmt.Errorf("save new stats: %w", err)
	}

	return nil
}
