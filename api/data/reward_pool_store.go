package data

import (
	"errors"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

var ErrEmptyWeeklyGolds = errors.New("empty rewards pool")

type WeeklyGoldsStore struct {
	db.Collection
}

func (s *WeeklyGoldsStore) CurrentRewardTokenIDs() ([]uint64, error) {
	var rewardIDs []uint64

	now := time.Now().UTC()
	var pool []*proto.WeeklyGolds
	err := s.Find(db.Cond{
		"start_at": db.Lte(now),
		"end_at":   db.Gte(now),
	}).All(&pool)
	if err != nil {
		return nil, err
	}

	for _, p := range pool {
		rewardIDs = append(rewardIDs, p.TokenID)
	}

	if len(rewardIDs) == 0 {
		return nil, ErrEmptyWeeklyGolds
	}

	return rewardIDs, nil
}
