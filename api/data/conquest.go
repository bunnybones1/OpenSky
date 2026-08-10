package data

import (
	"errors"
	"fmt"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

var errInvalidMode = errors.New("invalid game mode")

type Conquest struct {
	*proto.Conquest
}

func (c *Conquest) Store(sess db.Session) db.Store {
	return DB.Conquests(sess)
}

func (c *Conquest) Validate() error {
	if c.Conquest.Mode != proto.GameMode_CONQUEST_CONSTRUCTED && c.Conquest.Mode != proto.GameMode_CONQUEST_DISCOVERY {
		return errInvalidMode
	}

	if c.Conquest.Hero == proto.Hero_UNKNOWN {
		return errMissingParam("hero")
	}

	return nil
}

func (c *Conquest) BeforeUpdate(_ db.Session) error {
	if c.Status != proto.ConquestStatus_IN_PROGRESS {
		return nil
	}

	now := time.Now().UTC()

	wins := 0

	for _, r := range c.MatchProgress {
		if r == proto.ConquestMatchResult_LOSS {
			c.Status = proto.ConquestStatus_REWARDS_PENDING
			c.EndedAt = &now

			break
		}

		if r == proto.ConquestMatchResult_WIN {
			wins++
		}

		if wins == 3 {
			c.Status = proto.ConquestStatus_REWARDS_PENDING
			c.EndedAt = &now

			break
		}
	}

	return nil
}

func (c *Conquest) CanHaveMoreMatches() bool {
	var wins int

	for _, matchResult := range c.MatchProgress {
		switch matchResult {
		case proto.ConquestMatchResult_LOSS:
			return false
		case proto.ConquestMatchResult_WIN:
			wins++
		}
	}

	return wins < 3
}

var (
	_ interface {
		db.Record
		db.Validator
		db.BeforeUpdateHook
	} = &Conquest{}
)

type ConquestsStore struct {
	db.Collection
}

func (s *ConquestsStore) FindOne(conds ...interface{}) (*Conquest, error) {
	var conq *Conquest

	err := s.Find(conds...).Limit(1).One(&conq)
	if err != nil {
		return nil, err
	}

	return conq, nil
}

func (s *ConquestsStore) GetCount(accountID proto.AccountID) (uint64, error) {
	return s.Find(db.Cond{
		"account_id": accountID,
	}).Count()
}

func (s *ConquestsStore) FindInProgress(accountID proto.AccountID) (*Conquest, error) {
	var conquest *Conquest

	err := s.Find(db.Cond{
		"account_id": accountID,
		"status":     proto.ConquestStatus_IN_PROGRESS,
	}).One(&conquest)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find conquest in progress: %w", err)
	}

	if conquest == nil || errors.Is(err, db.ErrNoMoreRows) {
		return nil, nil
	}

	return conquest, nil
}

func (s *ConquestsStore) FindLastNonce(accountID proto.AccountID) (uint64, error) {
	var conquest *Conquest

	err := s.Find(db.Cond{"account_id": accountID}).OrderBy("-nonce").One(&conquest)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return 0, fmt.Errorf("find conquest in progress: %w", err)
	}

	if conquest == nil || errors.Is(err, db.ErrNoMoreRows) {
		return 0, nil
	}

	return conquest.Nonce, nil
}
