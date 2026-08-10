package conquestv2

import (
	"context"
	"fmt"
	"math"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

// TreasureCalculatorImpl calculates a progress for conquest treasures.
type TreasureCalculatorImpl struct {
	poolManager jobqueue.ConquestV2PoolManager
}

// NewTreasureCalculator instantiates a new V2TreasureCalculator.
func NewTreasureCalculator(poolManager jobqueue.ConquestV2PoolManager) *TreasureCalculatorImpl {
	return &TreasureCalculatorImpl{
		poolManager: poolManager,
	}
}

// FromConquestPoints calculates a progress in levels for treasures based on data.ConquestPoints.
func (v TreasureCalculatorImpl) FromConquestPoints(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
	currentPoints := conquestPoints.CurrentPoints

	treasureProgress := &data.ConquestV2TreasureProgress{
		ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{},
	}

	for i := 0; i < len(treasureLevelToTotalPointsMap); i++ {
		level := treasureLevel(i)

		if !v.isInRange(level, level+1, currentPoints) {
			continue
		}

		totalPointsRequired := treasureLevelToTotalPointsMap[level]

		treasureProgress.TreasureLevel = uint16(level)
		treasureProgress.TreasurePoints = currentPoints - totalPointsRequired
		treasureProgress.Weight = treasureLevelToTotalWeightMap[level]
		treasureProgress.PointsAccounted = totalPointsRequired

		if int(level) < len(treasureLevelToTotalPointsMap)-1 {
			treasureProgress.TreasurePointsRequired = treasureLevelToTotalPointsMap[level+1] - currentPoints
		}

		break
	}

	return treasureProgress, nil
}

// Get amount of silver cards in  treasure using weightPersilver and treasure level
func (v TreasureCalculatorImpl) GetSilverCardsAmountInTreasurePerLevelWithConfig(weightPerSilver float32, level uint16) int64 {
	treasureWeight := treasureLevelToTotalWeightMap[treasureLevel(level)]
	return int64(math.Floor(float64(treasureWeight * weightPerSilver)))
}

// Get amount of silver card in treasure only with treasure level
func (v TreasureCalculatorImpl) GetSilverCardsAmountInTreasurePerLevel(ctx context.Context, level uint16) (int64, error) {
	// Get config for Silver Cards weight
	cfg, err := v.poolManager.GetConfig(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed get conquest config: %w", err)
	}

	return v.GetSilverCardsAmountInTreasurePerLevelWithConfig(cfg.Settings.WeightPerSilverCard, level), nil
}

// Get amount of USDC in treasure using conquestPool object and treasure level
func (v TreasureCalculatorImpl) GetUSDCAmountInTreasurePerLevelWithPool(poolAmount uint64, poolTotalWeight float32, level uint16) int64 {
	treasureWeight := treasureLevelToTotalWeightMap[treasureLevel(level)]
	// Avoid early season 0 total weight situations
	if poolTotalWeight == 0 {
		poolTotalWeight = 1
	}
	return v.roundForReward(float32(poolAmount) / poolTotalWeight * treasureWeight)
}

// Get amount of USDC in treasure using only treasure level
func (v TreasureCalculatorImpl) GetUSDCAmountInTreasurePerLevel(ctx context.Context, level uint16) (int64, error) {
	pool, err := v.poolManager.GetPool(ctx)
	if err != nil {
		return 0, fmt.Errorf("get pool: %w", err)
	}

	return v.GetUSDCAmountInTreasurePerLevelWithPool(pool.Amount, pool.TotalWeight, level), nil
}

func (v TreasureCalculatorImpl) isInRange(levelDown, levelUp treasureLevel, points uint64) bool {
	if int(levelUp) == len(treasureLevelToTotalPointsMap) {
		return treasureLevelToTotalPointsMap[levelDown] <= points
	}

	return treasureLevelToTotalPointsMap[levelDown] <= points && points < treasureLevelToTotalPointsMap[levelUp]
}

func (v TreasureCalculatorImpl) roundForReward(f float32) int64 {
	dec := math.Pow10(6)
	return int64(math.Round(float64(f) * dec))
}
