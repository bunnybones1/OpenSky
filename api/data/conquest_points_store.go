package data

import (
	db "github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type ConquestPointsStore struct {
	db.Collection
}

func (s *ConquestPointsStore) findOne(conds ...interface{}) (*ConquestPoints, error) {
	var points ConquestPoints

	err := s.Find(conds...).Limit(1).One(&points)
	if err != nil {
		return nil, err
	}

	return &points, nil
}

func (s *ConquestPointsStore) findAll(conds ...interface{}) ([]*ConquestPoints, error) {
	var points []*ConquestPoints

	err := s.Find(conds...).OrderBy("-event_id").All(&points)
	if err != nil {
		return nil, err
	}

	return points, nil
}

func (s *ConquestPointsStore) FindOrCreateByAddressAndEventID(accountID proto.AccountID, eventID uint16) (*ConquestPoints, error) {
	points, err := s.findOne(db.Cond{
		"event_id":   eventID,
		"account_id": accountID,
	})

	switch err {
	case nil:
		return points, nil

	case db.ErrNoMoreRows:
		points = &ConquestPoints{
			ConquestPoints: &proto.ConquestPoints{
				AccountID:     accountID,
				EventID:       eventID,
				CurrentPoints: 0,
				TotalPoints:   0,
			},
		}

		if err := s.Session().Save(points); err != nil {
			return nil, err
		}
		return points, nil

	default:
		return nil, err
	}
}

func (s *ConquestPointsStore) FindByAddressAllEvents(address proto.Hash) ([]*ConquestPoints, error) {
	return s.findAll(db.Cond{
		"address": address,
	})
}
