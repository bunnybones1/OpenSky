package data

import (
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type LevelsPerSeason struct {
	*proto.LevelsPerSeason
}

func (s *LevelsPerSeason) Store(sess db.Session) db.Store {
	return DB.LevelsPerSeason(sess)
}

var (
	_ interface {
		db.Record
	} = &LevelsPerSeason{}
)

type LevelsPerSeasonStore struct {
	db.Collection
}

func (s *LevelsPerSeasonStore) FindByAccountIDAllSeasons(accountID proto.AccountID) ([]*LevelsPerSeason, error) {
	var levels []*LevelsPerSeason

	err := s.Find(db.Cond{"account_id": accountID}).OrderBy("-levels", "-season").All(&levels)
	if err != nil {
		return nil, err
	}

	return levels, nil
}

func (s *LevelsPerSeasonStore) SetLevels(account *Account, levels uint64, season uint16) error {
	if account.InvitedByID == nil || !account.InvitedByID.IsValid() {
		return nil // nothing to do
	}

	_, err := s.Session().SQL().InsertInto("levels_per_season").Values(&proto.LevelsPerSeason{
		AccountID: account.ID,
		InviterID: *account.InvitedByID,
		Season:    season,
		Levels:    levels,
	}).Amend(func(s string) string {
		return s + `
			ON CONFLICT (account_id, inviter_id, season)
			DO UPDATE
				SET
					levels = levels_per_season.levels + EXCLUDED.levels
		`
	}).Exec()

	return err
}

func (s *LevelsPerSeasonStore) GetFriendsList(accountID proto.AccountID, season uint16) ([]*proto.FriendPoints, error) {
	var friends []*proto.FriendPoints

	err := s.Session().SQL().
		Select(
			db.Raw(`COALESCE(lps.season, ?) AS season`, season),
			db.Raw(`COALESCE(lps.levels, 0) AS levels`),
			db.Raw(`COALESCE(lps.points_spent, 0) AS points_spent`),
			db.Raw(`COALESCE(lps.points_carried + lps.levels, 0) AS points`),
			`a.id AS account.id`,
			`a.address AS account.address`,
			`a.name AS account.name`,
			`a.locale AS account.locale`,
			`a.level AS account.level`,
			`a.region AS account.region`,
			`a.invited_by AS account.invited_by`,
			`a.tag_art_id AS account.tag_art_id`,
		).
		From("accounts a").
		LeftJoin("levels_per_season lps").
		On("lps.account_id = a.id AND lps.season = ?", season).
		Where(
			db.Cond{
				"a.invited_by": accountID,
				"a.status":     db.AnyOf(ActiveStatuses),
			}).
		OrderBy("-points", "a.id").
		Limit(5).
		All(&friends)
	if err != nil {
		return nil, err
	}

	return friends, nil
}

func (s *LevelsPerSeasonStore) CarryPointsOverToNewSeason(targetSeason uint16) error {
	_, err := s.Session().SQL().Exec(`
			INSERT INTO levels_per_season (
				season,
				account_id,
				inviter_id,
				points_carried
			) SELECT * FROM (
				SELECT
					season + 1 AS season,
					account_id,
					inviter_id,
					levels + points_carried - points_spent AS points_carried
				FROM levels_per_season
				WHERE season = ? - 1
			) AS carry
			WHERE
				points_carried > 0
			ON CONFLICT (
				account_id,
				season,
				inviter_id
			) DO UPDATE SET points_carried = EXCLUDED.points_carried
		`, targetSeason)
	if err != nil {
		return fmt.Errorf("carry points over to new season: %w", err)
	}

	return nil
}
