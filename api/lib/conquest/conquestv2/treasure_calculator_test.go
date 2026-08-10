package conquestv2_test

import (
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestTreasureCalculator(t *testing.T) {
	var cacheStore *mock.MockStore[[]byte]

	var treasureLevelSummaryGetter *mock.MockTreasureLevelSummaryGetter

	tests := []struct {
		points                                                                                          uint64
		expectedLevel, expectedPoints, expectedPointsRequired, expectedPointsAccounted, expectedSilvers int
		expectedWeight                                                                                  float32
		expectedUSDC                                                                                    int64
	}{
		{ // No points.
			points:                  0,
			expectedLevel:           0,
			expectedPoints:          0,
			expectedPointsRequired:  250,
			expectedWeight:          0,
			expectedPointsAccounted: 0,
			expectedSilvers:         0,
			expectedUSDC:            0,
		},
		{
			points:                  10,
			expectedLevel:           0,
			expectedPoints:          10,
			expectedPointsRequired:  240,
			expectedWeight:          0,
			expectedPointsAccounted: 0,
			expectedSilvers:         0,
			expectedUSDC:            0,
		},
		{ // Points exactly to reach next tier.
			points:                  250,
			expectedLevel:           1,
			expectedPoints:          0,
			expectedPointsRequired:  500,
			expectedWeight:          1,
			expectedPointsAccounted: 250,
			expectedSilvers:         0,
			expectedUSDC:            441345,
		},
		{
			points:                  300,
			expectedLevel:           1,
			expectedPoints:          50,
			expectedPointsRequired:  450,
			expectedWeight:          1,
			expectedPointsAccounted: 250,
			expectedSilvers:         0,
			expectedUSDC:            441345,
		},
		{
			points:                  900,
			expectedLevel:           2,
			expectedPoints:          150,
			expectedPointsRequired:  600,
			expectedWeight:          3.19,
			expectedPointsAccounted: 750,
			expectedSilvers:         0,
			expectedUSDC:            1407891,
		},
		{
			points:                  2000,
			expectedLevel:           3,
			expectedPoints:          500,
			expectedPointsRequired:  500,
			expectedWeight:          6.9,
			expectedPointsAccounted: 1500,
			expectedSilvers:         0,
			expectedUSDC:            3045282,
		},
		{
			points:                  3000,
			expectedLevel:           4,
			expectedPoints:          500,
			expectedPointsRequired:  750,
			expectedWeight:          12.65,
			expectedPointsAccounted: 2500,
			expectedSilvers:         0,
			expectedUSDC:            5583017,
		},
		{
			points:                  4000,
			expectedLevel:           5,
			expectedPoints:          250,
			expectedPointsRequired:  1250,
			expectedWeight:          21.32,
			expectedPointsAccounted: 3750,
			expectedSilvers:         1,
			expectedUSDC:            9409480,
		},
		{
			points:                  6000,
			expectedLevel:           6,
			expectedPoints:          750,
			expectedPointsRequired:  1000,
			expectedWeight:          34.29,
			expectedPointsAccounted: 5250,
			expectedSilvers:         1,
			expectedUSDC:            15133728,
		},
		{
			points:                  8000,
			expectedLevel:           7,
			expectedPoints:          1000,
			expectedPointsRequired:  1000,
			expectedWeight:          53.99,
			expectedPointsAccounted: 7000,
			expectedSilvers:         2,
			expectedUSDC:            23828228,
		},
		{
			points:                  10000,
			expectedLevel:           8,
			expectedPoints:          1000,
			expectedPointsRequired:  1250,
			expectedWeight:          84.67,
			expectedPointsAccounted: 9000,
			expectedSilvers:         4,
			expectedUSDC:            37368698,
		},
		{
			points:                  12000,
			expectedLevel:           9,
			expectedPoints:          750,
			expectedPointsRequired:  1750,
			expectedWeight:          134.32,
			expectedPointsAccounted: 11250,
			expectedSilvers:         6,
			expectedUSDC:            59281494,
		},
		{
			points:                  15000,
			expectedLevel:           10,
			expectedPoints:          1250,
			expectedPointsRequired:  0,
			expectedWeight:          218.69,
			expectedPointsAccounted: 13750,
			expectedSilvers:         10,
			expectedUSDC:            96517784,
		},
	}

	// Setup for cache pool
	{
		ctrl := gomock.NewController(t)
		cacheStore = mock.NewMockStore[[]byte](ctrl)
		treasureLevelSummaryGetter = mock.NewMockTreasureLevelSummaryGetter(ctrl)
	}

	maxPoolCeiling := int32(100)
	poolCeiling := int32(50)
	poolFloor := int32(10)
	poolTTL := time.Minute

	defaultConfig := config.OpenSkyConquestV2Config{
		MaxPoolCeiling:        maxPoolCeiling,
		PoolCeiling:           poolCeiling,
		PoolFloor:             poolFloor,
		TopWeightUnitPrice:    1,
		BottomWeightUnitPrice: 0.9,
		PoolTTL:               poolTTL,
		WeightPerSilverCard:   0.05,
	}

	poolManager := conquestv2.NewPoolManager(defaultConfig, zerolog.Nop(), cacheStore, treasureLevelSummaryGetter, nil)
	calculator := conquestv2.NewTreasureCalculator(poolManager)

	for _, test := range tests {
		conquestPoints := &data.ConquestPoints{
			ConquestPoints: &proto.ConquestPoints{
				CurrentPoints: test.points,
			},
		}

		treasureProgress, err := calculator.FromConquestPoints(conquestPoints)
		require.NoError(t, err)

		assert.Equal(t, test.expectedLevel, int(treasureProgress.TreasureLevel))
		assert.Equal(t, test.expectedPoints, int(treasureProgress.TreasurePoints))
		assert.Equal(t, test.expectedPointsRequired, int(treasureProgress.TreasurePointsRequired))
		assert.Equal(t, test.expectedWeight, treasureProgress.Weight)
		assert.Equal(t, test.expectedPointsAccounted, int(treasureProgress.PointsAccounted))

		silverAMount := calculator.GetSilverCardsAmountInTreasurePerLevelWithConfig(defaultConfig.WeightPerSilverCard, treasureProgress.TreasureLevel)
		assert.Equal(t, test.expectedSilvers, int(silverAMount))

		usdcAmount := calculator.GetUSDCAmountInTreasurePerLevelWithPool(100, 226.58, treasureProgress.TreasureLevel)
		assert.Equal(t, test.expectedUSDC, usdcAmount)
	}
}
