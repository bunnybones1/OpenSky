package data

import (
	"errors"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type TutorialProgress struct {
	*proto.TutorialProgress
}

func (a *TutorialProgress) Store(sess db.Session) db.Store {
	return DB.TutorialProgress(sess)
}

type TutorialProgressStore struct {
	db.Collection
}

func (s *TutorialProgressStore) RecordProgress(accountID proto.AccountID, level proto.TutorialLevel) error {
	if level == proto.TutorialLevel_UNKNOWN {
		return errors.New("invalid level")
	}

	sess := s.Session()

	_, err := sess.SQL().InsertInto("tutorial_progress").Values(&proto.TutorialProgress{
		AccountID: accountID,
		Level:     level,
		Completed: true,
	}).Amend(func(s string) string {
		return s + `
			ON CONFLICT (account_id, level)
			DO UPDATE
				SET completed = true
		`
	}).Exec()
	if err != nil {
		return fmt.Errorf("Exec: %w", err)
	}
	return nil
}

func (s *TutorialProgressStore) IsCompleted(accountID proto.AccountID, level proto.TutorialLevel) (bool, error) {
	if level == proto.TutorialLevel_UNKNOWN {
		return false, errors.New("invalid level")
	}
	exists, err := s.Find(db.Cond{
		"account_id": accountID,
		"level":      level,
		"completed":  true,
	}).Exists()
	if err != nil {
		return false, fmt.Errorf("Exists: %w", err)
	}
	return exists, nil
}

func (s *TutorialProgressStore) FindOne(conds ...interface{}) (*TutorialProgress, error) {
	var progress TutorialProgress
	err := s.Find(conds...).One(&progress)
	if err != nil {
		return nil, fmt.Errorf("Find: %w", err)
	}
	return &progress, nil
}
