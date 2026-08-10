package conquestv2

import (
	"context"
	"fmt"
	"math"

	"github.com/horizon-games/OpenSky/api/proto"
)

// SummaryGetter provides conquest summary.
type SummaryGetter struct {
	poolGetter                 PoolGetter
	treasureLevelSummaryGetter TreasureLevelSummaryGetter
}

// NewSummaryGetter instantiates a new SummaryGetter.
func NewSummaryGetter(poolGetter PoolGetter, treasureLevelSummaryGetter TreasureLevelSummaryGetter) *SummaryGetter {
	return &SummaryGetter{
		poolGetter:                 poolGetter,
		treasureLevelSummaryGetter: treasureLevelSummaryGetter,
	}
}

// Get gets conquest summary.
// The weight unit price is rounded with a precision of 4 decimal points.
func (s *SummaryGetter) Get(ctx context.Context) (*proto.ConquestV2Summary, error) {
	pool, err := s.poolGetter.GetPool(ctx)
	if err != nil {
		return nil, fmt.Errorf("get pool: %w", err)
	}

	treasureLevels, err := s.treasureLevelSummaryGetter.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("get treasure levels: %w", err)
	}

	var totalWeight float32

	for _, level := range treasureLevels {
		totalWeight += level.TotalWeight
	}

	var weightUnitPrice float32

	if totalWeight > 0 {
		weightUnitPrice = float32(math.Round(float64(pool.Amount)/float64(totalWeight)*10000) / 10000)
	}

	return &proto.ConquestV2Summary{
		Pool:            pool.Amount,
		TotalWeight:     totalWeight,
		WeightUnitPrice: weightUnitPrice,
		TreasureLevels:  treasureLevels,
	}, nil
}

// PoolGetter provides pool.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/pool_getter.go -package mock . PoolGetter
type PoolGetter interface {
	GetPool(context.Context) (*proto.ConquestV2Pool, error)
}
