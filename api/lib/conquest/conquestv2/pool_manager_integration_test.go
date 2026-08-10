//go:build integration

package conquestv2_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestPoolManager(t *testing.T) {
	ctx := apitest.DBContext(context.Background())

	var cacheStore *mock.MockStore[[]byte]

	var treasureLevelSummaryGetter *mock.MockTreasureLevelSummaryGetter

	var metricsCollector *mock.MockMetricsCollector

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			cacheStore = mock.NewMockStore[[]byte](ctrl)
			treasureLevelSummaryGetter = mock.NewMockTreasureLevelSummaryGetter(ctrl)
			metricsCollector = mock.NewMockMetricsCollector(ctrl)

			metricsCollector.EXPECT().TrackConquestPoolAmount(gomock.Any()).AnyTimes()
			metricsCollector.EXPECT().TrackConquestTotalWeight(gomock.Any()).AnyTimes()
			metricsCollector.EXPECT().TrackConquestTotalWeightPriceTop(gomock.Any()).AnyTimes()
			metricsCollector.EXPECT().TrackConquestTotalWeightPriceBottom(gomock.Any()).AnyTimes()
			metricsCollector.EXPECT().TrackConquestWeightUnitPrice(gomock.Any()).AnyTimes()
		}
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
	}

	poolManager := conquestv2.NewPoolManager(defaultConfig, zerolog.Nop(), cacheStore, treasureLevelSummaryGetter, metricsCollector)

	t.Run("set and get config", func(t *testing.T) {
		t.Run("final value is default value when the settings value is zero", func(t *testing.T) {
			zeroInt32 := int32(0)
			zeroFloat32 := float32(0)

			err := poolManager.SetConfig(ctx, &zeroInt32, &zeroInt32, &zeroFloat32, &zeroFloat32, &zeroFloat32)
			require.NoError(t, err)

			poolConfig, err := poolManager.GetConfig(ctx)
			require.NoError(t, err)

			assert.Equal(t, defaultConfig.MaxPoolCeiling, *poolConfig.Default.MaxPoolCeiling)
			assert.Equal(t, defaultConfig.PoolCeiling, poolConfig.Default.PoolCeiling)
			assert.Equal(t, defaultConfig.PoolFloor, poolConfig.Default.PoolFloor)
			assert.Equal(t, defaultConfig.TopWeightUnitPrice, poolConfig.Default.TopWeightUnitPrice)
			assert.Equal(t, defaultConfig.BottomWeightUnitPrice, poolConfig.Default.BottomWeightUnitPrice)

			assert.Nil(t, poolConfig.Settings.MaxPoolCeiling)
			assert.Zero(t, poolConfig.Settings.PoolCeiling)
			assert.Zero(t, poolConfig.Settings.PoolFloor)
			assert.Zero(t, poolConfig.Settings.TopWeightUnitPrice)
			assert.Zero(t, poolConfig.Settings.BottomWeightUnitPrice)

			assert.Equal(t, defaultConfig.MaxPoolCeiling, *poolConfig.Final.MaxPoolCeiling)
			assert.Equal(t, defaultConfig.PoolCeiling, poolConfig.Final.PoolCeiling)
			assert.Equal(t, defaultConfig.PoolFloor, poolConfig.Final.PoolFloor)
			assert.Equal(t, defaultConfig.TopWeightUnitPrice, poolConfig.Final.TopWeightUnitPrice)
			assert.Equal(t, defaultConfig.BottomWeightUnitPrice, poolConfig.Final.BottomWeightUnitPrice)
		})

		t.Run("final value is settings value when the settings value is non-zero", func(t *testing.T) {
			poolCeiling := int32(20)
			poolFloor := int32(4)
			topWeightUnitPrice := float32(2)
			bottomWeightUnitPrice := float32(1.8)
			weightPerSilverCard := float32(250)

			err := poolManager.SetConfig(ctx, &poolCeiling, &poolFloor, &topWeightUnitPrice, &bottomWeightUnitPrice, &weightPerSilverCard)
			require.NoError(t, err)

			poolConfig, err := poolManager.GetConfig(ctx)
			require.NoError(t, err)

			assert.Equal(t, defaultConfig.MaxPoolCeiling, *poolConfig.Default.MaxPoolCeiling)
			assert.Equal(t, defaultConfig.PoolCeiling, poolConfig.Default.PoolCeiling)
			assert.Equal(t, defaultConfig.PoolFloor, poolConfig.Default.PoolFloor)
			assert.Equal(t, defaultConfig.TopWeightUnitPrice, poolConfig.Default.TopWeightUnitPrice)
			assert.Equal(t, defaultConfig.BottomWeightUnitPrice, poolConfig.Default.BottomWeightUnitPrice)
			assert.Equal(t, defaultConfig.WeightPerSilverCard, poolConfig.Default.WeightPerSilverCard)

			assert.Nil(t, poolConfig.Settings.MaxPoolCeiling)
			assert.Equal(t, poolCeiling, poolConfig.Settings.PoolCeiling)
			assert.Equal(t, poolFloor, poolConfig.Settings.PoolFloor)
			assert.Equal(t, topWeightUnitPrice, poolConfig.Settings.TopWeightUnitPrice)
			assert.Equal(t, bottomWeightUnitPrice, poolConfig.Settings.BottomWeightUnitPrice)
			assert.Equal(t, weightPerSilverCard, poolConfig.Settings.WeightPerSilverCard)

			assert.Equal(t, defaultConfig.MaxPoolCeiling, *poolConfig.Final.MaxPoolCeiling)
			assert.Equal(t, poolCeiling, poolConfig.Final.PoolCeiling)
			assert.Equal(t, poolFloor, poolConfig.Final.PoolFloor)
			assert.Equal(t, topWeightUnitPrice, poolConfig.Final.TopWeightUnitPrice)
			assert.Equal(t, bottomWeightUnitPrice, poolConfig.Final.BottomWeightUnitPrice)
			assert.Equal(t, weightPerSilverCard, poolConfig.Final.WeightPerSilverCard)
		})

		t.Run("nil value does not change previous settings value", func(t *testing.T) {
			poolCeiling := int32(20)
			poolFloor := int32(4)
			topWeightUnitPrice := float32(2)
			bottomWeightUnitPrice := float32(1.8)
			weightPerSilverCard := float32(250)

			err := poolManager.SetConfig(ctx, &poolCeiling, &poolFloor, &topWeightUnitPrice, &bottomWeightUnitPrice, &weightPerSilverCard)
			require.NoError(t, err)

			poolConfig, err := data.DB.Settings(nil).FindConquestV2Pool()
			require.NoError(t, err)

			assert.Equal(t, poolCeiling, poolConfig.PoolCeiling)
			assert.Equal(t, poolFloor, poolConfig.PoolFloor)
			assert.Equal(t, topWeightUnitPrice, poolConfig.TopWeightUnitPrice)
			assert.Equal(t, bottomWeightUnitPrice, poolConfig.BottomWeightUnitPrice)

			err = poolManager.SetConfig(ctx, nil, nil, nil, nil, nil)
			require.NoError(t, err)

			poolConfig, err = data.DB.Settings(nil).FindConquestV2Pool()
			require.NoError(t, err)

			assert.Equal(t, poolCeiling, poolConfig.PoolCeiling)
			assert.Equal(t, poolFloor, poolConfig.PoolFloor)
			assert.Equal(t, topWeightUnitPrice, poolConfig.TopWeightUnitPrice)
			assert.Equal(t, bottomWeightUnitPrice, poolConfig.BottomWeightUnitPrice)
		})

		t.Run("negative value does not change previous settings value", func(t *testing.T) {
			poolCeiling := int32(20)
			poolFloor := int32(4)
			topWeightUnitPrice := float32(2)
			bottomWeightUnitPrice := float32(1.8)
			weightPerSilverCard := float32(250)

			err := poolManager.SetConfig(ctx, &poolCeiling, &poolFloor, &topWeightUnitPrice, &bottomWeightUnitPrice, &weightPerSilverCard)
			require.NoError(t, err)

			poolConfig, err := data.DB.Settings(nil).FindConquestV2Pool()
			require.NoError(t, err)

			assert.Equal(t, poolCeiling, poolConfig.PoolCeiling)
			assert.Equal(t, poolFloor, poolConfig.PoolFloor)
			assert.Equal(t, topWeightUnitPrice, poolConfig.TopWeightUnitPrice)
			assert.Equal(t, bottomWeightUnitPrice, poolConfig.BottomWeightUnitPrice)

			negativePoolCeiling := int32(-20)
			negativePoolFloor := int32(-4)
			negativeTopWeightUnitPrice := float32(-2)
			negativeBottomWeightUnitPrice := float32(-1.8)
			negativeWeightPerSilverCard := float32(-250)

			err = poolManager.SetConfig(ctx, &negativePoolCeiling, &negativePoolFloor, &negativeTopWeightUnitPrice, &negativeBottomWeightUnitPrice, &negativeWeightPerSilverCard)
			require.NoError(t, err)

			poolConfig, err = data.DB.Settings(nil).FindConquestV2Pool()
			require.NoError(t, err)

			assert.Equal(t, poolCeiling, poolConfig.PoolCeiling)
			assert.Equal(t, poolFloor, poolConfig.PoolFloor)
			assert.Equal(t, topWeightUnitPrice, poolConfig.TopWeightUnitPrice)
			assert.Equal(t, bottomWeightUnitPrice, poolConfig.BottomWeightUnitPrice)
		})

		t.Run("zero value does change previous settings value", func(t *testing.T) {
			poolCeiling := int32(20)
			poolFloor := int32(4)
			topWeightUnitPrice := float32(2)
			bottomWeightUnitPrice := float32(1.8)
			weightPerSilverCard := float32(250)

			err := poolManager.SetConfig(ctx, &poolCeiling, &poolFloor, &topWeightUnitPrice, &bottomWeightUnitPrice, &weightPerSilverCard)
			require.NoError(t, err)

			poolConfig, err := data.DB.Settings(nil).FindConquestV2Pool()
			require.NoError(t, err)

			assert.Equal(t, poolCeiling, poolConfig.PoolCeiling)
			assert.Equal(t, poolFloor, poolConfig.PoolFloor)
			assert.Equal(t, topWeightUnitPrice, poolConfig.TopWeightUnitPrice)
			assert.Equal(t, bottomWeightUnitPrice, poolConfig.BottomWeightUnitPrice)

			zeroPoolCeiling := int32(0)
			zeroPoolFloor := int32(0)
			zeroTopWeightUnitPrice := float32(0)
			zeroBottomWeightUnitPrice := float32(0)
			zeroWeightPerSilverCard := float32(0)

			err = poolManager.SetConfig(ctx, &zeroPoolCeiling, &zeroPoolFloor, &zeroTopWeightUnitPrice, &zeroBottomWeightUnitPrice, &zeroWeightPerSilverCard)
			require.NoError(t, err)

			poolConfig, err = data.DB.Settings(nil).FindConquestV2Pool()
			require.NoError(t, err)

			assert.Equal(t, zeroPoolCeiling, poolConfig.PoolCeiling)
			assert.Equal(t, zeroPoolFloor, poolConfig.PoolFloor)
			assert.Equal(t, zeroTopWeightUnitPrice, poolConfig.TopWeightUnitPrice)
			assert.Equal(t, zeroBottomWeightUnitPrice, poolConfig.BottomWeightUnitPrice)
		})

		t.Cleanup(func() {
			err := data.DB.Settings(nil).SaveConquestV2Pool(&data.SettingsConquestV2Pool{})
			require.NoError(t, err)
		})
	})

	t.Run("get pool", func(t *testing.T) {
		t.Run("returns pool floor when there are no conquest points", func(t *testing.T) {
			cacheStore.EXPECT().Get(gomock.Any(), conquestv2.CacheStorePoolKey)
			cacheStore.EXPECT().Set(gomock.Any(), conquestv2.CacheStorePoolKey, gomock.Any())

			treasureLevelSummaryGetter.EXPECT().Get(gomock.Any())

			pool, err := poolManager.GetPool(ctx)
			require.NoError(t, err)

			assert.Equal(t, poolFloor, int32(pool.Amount))
		})

		t.Run("returns pool floor when the pool floor is above the total top weight", func(t *testing.T) {
			cacheStore.EXPECT().Get(gomock.Any(), conquestv2.CacheStorePoolKey)
			cacheStore.EXPECT().Set(gomock.Any(), conquestv2.CacheStorePoolKey, gomock.Any())

			summaries := []*proto.ConquestV2TreasureLevelSummary{{TotalWeight: float32(poolFloor) + 1}}

			treasureLevelSummaryGetter.EXPECT().Get(gomock.Any()).Return(summaries, nil)

			pool, err := poolManager.GetPool(ctx)
			require.NoError(t, err)

			assert.Equal(t, poolFloor, int32(pool.Amount))
		})

		t.Run("returns calculated pool based top weight unit price when the pool floor is lower the total bottom weight", func(t *testing.T) {
			cacheStore.EXPECT().Get(gomock.Any(), conquestv2.CacheStorePoolKey)
			cacheStore.EXPECT().Set(gomock.Any(), conquestv2.CacheStorePoolKey, gomock.Any())

			summaries := []*proto.ConquestV2TreasureLevelSummary{{TotalWeight: 20}}

			treasureLevelSummaryGetter.EXPECT().Get(gomock.Any()).Return(summaries, nil)

			pool, err := poolManager.GetPool(ctx)
			require.NoError(t, err)

			assert.Equal(t, 20, int(pool.Amount))
		})

		t.Run("returns pool ceiling when the total top weight is above pool ceiling", func(t *testing.T) {
			cacheStore.EXPECT().Get(gomock.Any(), conquestv2.CacheStorePoolKey)
			cacheStore.EXPECT().Set(gomock.Any(), conquestv2.CacheStorePoolKey, gomock.Any())

			summaries := []*proto.ConquestV2TreasureLevelSummary{{TotalWeight: 60}}

			treasureLevelSummaryGetter.EXPECT().Get(gomock.Any()).Return(summaries, nil)

			pool, err := poolManager.GetPool(ctx)
			require.NoError(t, err)

			assert.Equal(t, poolCeiling, int32(pool.Amount))
		})

		t.Run("returns max pool ceiling when the total weight is above pool ceiling and the pool ceiling is above max pool ceiling", func(t *testing.T) {
			// Setup
			{
				// Conquest V2 Pool settings
				{
					poolCeiling := int32(120)
					err := poolManager.SetConfig(ctx, &poolCeiling, nil, nil, nil, nil)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.Settings(nil).SaveConquestV2Pool(&data.SettingsConquestV2Pool{})
						require.NoError(t, err)
					})
				}
			}

			cacheStore.EXPECT().Get(gomock.Any(), conquestv2.CacheStorePoolKey)
			cacheStore.EXPECT().Set(gomock.Any(), conquestv2.CacheStorePoolKey, gomock.Any())

			summaries := []*proto.ConquestV2TreasureLevelSummary{{TotalWeight: 120}}

			treasureLevelSummaryGetter.EXPECT().Get(gomock.Any()).Return(summaries, nil)

			pool, err := poolManager.GetPool(ctx)
			require.NoError(t, err)

			assert.Equal(t, maxPoolCeiling, int32(pool.Amount))
		})

		t.Run("returns cached value when the TTL is still valid", func(t *testing.T) {
			expectedAmount := 200
			expectedTotalWeight := float32(123.45)

			cache := map[string]interface{}{
				"amount":      expectedAmount,
				"totalWeight": expectedTotalWeight,
				"ttl":         time.Now().Add(time.Minute),
			}

			bytesCache, err := json.Marshal(cache)
			require.NoError(t, err)

			cacheStore.EXPECT().Get(gomock.Any(), conquestv2.CacheStorePoolKey).Return(bytesCache, true, nil)

			pool, err := poolManager.GetPool(ctx)
			require.NoError(t, err)

			assert.Equal(t, expectedAmount, int(pool.Amount))
			assert.Equal(t, expectedTotalWeight, pool.TotalWeight)
		})

		t.Run("returns cached value and extends its validity when the TTL is invalid and the cached value is above the total bottom weight and below total top weight", func(t *testing.T) {
			expectedPool := poolCeiling - 1
			expectedTotalWeight := float32(expectedPool) + 0.5

			cache := map[string]interface{}{
				"amount":      expectedPool,
				"totalWeight": 12.3,
				"ttl":         time.Now().Add(-time.Minute),
			}

			bytesCache, err := json.Marshal(cache)
			require.NoError(t, err)

			cacheStore.EXPECT().Get(gomock.Any(), conquestv2.CacheStorePoolKey).Return(bytesCache, true, nil)
			cacheStore.EXPECT().
				Set(gomock.Any(), conquestv2.CacheStorePoolKey, gomock.Any()).
				DoAndReturn(func(_ context.Context, _ string, value []byte) error {
					obj := struct {
						Amount      int32
						TotalWeight float32
						TTL         time.Time
					}{}

					err := json.Unmarshal(value, &obj)
					require.NoError(t, err)

					assert.Equal(t, expectedPool, obj.Amount)
					assert.Equal(t, expectedTotalWeight, obj.TotalWeight)
					assert.True(t, obj.TTL.After(time.Now()))

					return nil
				})

			summaries := []*proto.ConquestV2TreasureLevelSummary{{TotalWeight: expectedTotalWeight}}

			treasureLevelSummaryGetter.EXPECT().Get(gomock.Any()).Return(summaries, nil)

			pool, err := poolManager.GetPool(ctx)
			require.NoError(t, err)

			assert.Equal(t, expectedPool, int32(pool.Amount))
			assert.Equal(t, expectedTotalWeight, pool.TotalWeight)
		})

		t.Run("returns pool ceiling when the TTL is invalid and the cached value is above the total bottom weight and cached value is above pool ceiling", func(t *testing.T) {
			cachedPool := poolCeiling + 1
			expectedTotalWeight := float32(cachedPool) + 0.5

			cache := map[string]interface{}{
				"amount":      cachedPool,
				"totalWeight": 12.3,
				"ttl":         time.Now().Add(-time.Minute),
			}

			bytesCache, err := json.Marshal(cache)
			require.NoError(t, err)

			cacheStore.EXPECT().Get(gomock.Any(), conquestv2.CacheStorePoolKey).Return(bytesCache, true, nil)
			cacheStore.EXPECT().
				Set(gomock.Any(), conquestv2.CacheStorePoolKey, gomock.Any()).
				DoAndReturn(func(_ context.Context, _ string, value []byte) error {
					obj := struct {
						Amount      int32
						TotalWeight float32
						TTL         time.Time
					}{}

					err := json.Unmarshal(value, &obj)
					require.NoError(t, err)

					assert.Equal(t, poolCeiling, obj.Amount)
					assert.Equal(t, expectedTotalWeight, obj.TotalWeight)
					assert.True(t, obj.TTL.After(time.Now()))

					return nil
				})

			summaries := []*proto.ConquestV2TreasureLevelSummary{{TotalWeight: expectedTotalWeight}}

			treasureLevelSummaryGetter.EXPECT().Get(gomock.Any()).Return(summaries, nil)

			pool, err := poolManager.GetPool(ctx)
			require.NoError(t, err)

			assert.Equal(t, poolCeiling, int32(pool.Amount))
			assert.Equal(t, expectedTotalWeight, pool.TotalWeight)
		})
	})

	t.Run("recalculate pool", func(t *testing.T) {
		cacheStore.EXPECT().Set(gomock.Any(), conquestv2.CacheStorePoolKey, gomock.Any())

		summaries := []*proto.ConquestV2TreasureLevelSummary{{TotalWeight: 20}}

		treasureLevelSummaryGetter.EXPECT().Get(gomock.Any()).Return(summaries, nil)

		err := poolManager.RecalculatePool(ctx)
		require.NoError(t, err)
	})
}
