package conquestv2

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/goware/cachestore"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

const (
	CacheStorePoolKey = "conquest_v2_pool"
)

// PoolManager manages pool for conquest v2.
type PoolManager struct {
	cfg                        config.OpenSkyConquestV2Config
	logger                     zerolog.Logger
	cacheStore                 cachestore.Store[[]byte]
	treasureLevelSummaryGetter TreasureLevelSummaryGetter
	metricsCollector           MetricsCollector
}

// NewPoolManager instantiates a new PoolManager.
func NewPoolManager(
	cfg config.OpenSkyConquestV2Config,
	logger zerolog.Logger,
	cacheStore cachestore.Store[[]byte],
	treasureLevelSummaryGetter TreasureLevelSummaryGetter,
	metricsCollector MetricsCollector,
) *PoolManager {
	return &PoolManager{
		cfg:                        cfg,
		logger:                     logger,
		cacheStore:                 cacheStore,
		treasureLevelSummaryGetter: treasureLevelSummaryGetter,
		metricsCollector:           metricsCollector,
	}
}

// GetPool gets pool amount.
// It uses cached value if it is within the TTL period or recalculates a new one.
// If the one value is between the bottom weight price and top weight price, it uses the cached value
// and extends TTL.
// The value gets rounded to tens.
func (m *PoolManager) GetPool(ctx context.Context) (*proto.ConquestV2Pool, error) {
	bytesCachedPool, exists, err := m.cacheStore.Get(ctx, CacheStorePoolKey)
	if err != nil {
		return nil, fmt.Errorf("get pool from cache: %w", err)
	}

	cachedPool := &cachedPool{}

	if exists {
		if err := json.Unmarshal(bytesCachedPool, &cachedPool); err != nil {
			m.logger.Err(err).Msg("decode cached pool")
		}
	}

	if cachedPool == nil || cachedPool.TTL.Before(data.TimeNowUTC()) {
		cachedPool, err = m.recalculate(ctx, cachedPool)
		if err != nil {
			return nil, fmt.Errorf("recalculate: %w", err)
		}
	}

	pool := &proto.ConquestV2Pool{
		Amount:      cachedPool.Amount,
		TotalWeight: cachedPool.TotalWeight,
	}

	return pool, nil
}

// RecalculatePool recalculates a new pool amount no matter what is in the cache.
func (m *PoolManager) RecalculatePool(ctx context.Context) error {
	_, err := m.recalculate(ctx, nil)
	if err != nil {
		return fmt.Errorf("recalculate: %w", err)
	}

	return nil
}

func (m *PoolManager) recalculate(ctx context.Context, pool *cachedPool) (*cachedPool, error) {
	config, err := m.GetConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("get config: %w", err)
	}

	totalWeightForAllPlayers, err := m.getTotalWeightForAllPlayers(ctx)
	if err != nil {
		return nil, fmt.Errorf("get total weight for all players: %w", err)
	}

	topTotalWeightPrice := m.roundForPool(totalWeightForAllPlayers * config.Final.TopWeightUnitPrice)
	bottomTotalWeightPrice := m.roundForPool(totalWeightForAllPlayers * config.Final.BottomWeightUnitPrice)

	poolCeiling := uint64(config.Final.PoolCeiling)
	if poolCeiling > uint64(*config.Final.MaxPoolCeiling) {
		poolCeiling = uint64(*config.Final.MaxPoolCeiling)
	}

	poolFloor := uint64(config.Final.PoolFloor)

	if pool == nil {
		pool = &cachedPool{}
	}

	if pool.Amount < bottomTotalWeightPrice {
		pool.Amount = topTotalWeightPrice
	}

	if pool.Amount > topTotalWeightPrice {
		pool.Amount = topTotalWeightPrice
	}

	if pool.Amount < poolFloor {
		pool.Amount = poolFloor
	}

	if pool.Amount > poolCeiling {
		pool.Amount = poolCeiling
	}

	pool.TotalWeight = totalWeightForAllPlayers
	pool.TTL = data.TimeNowUTC().Add(m.cfg.PoolTTL)

	bytesPool, err := json.Marshal(pool)
	if err != nil {
		return nil, fmt.Errorf("encode pool: %w", err)
	}

	err = m.cacheStore.Set(ctx, CacheStorePoolKey, bytesPool)
	if err != nil {
		return nil, fmt.Errorf("set pool to cache store: %w", err)
	}

	m.metricsCollector.TrackConquestPoolAmount(pool.Amount)
	m.metricsCollector.TrackConquestTotalWeight(pool.TotalWeight)
	m.metricsCollector.TrackConquestTotalWeightPriceTop(topTotalWeightPrice)
	m.metricsCollector.TrackConquestTotalWeightPriceBottom(bottomTotalWeightPrice)
	m.metricsCollector.TrackConquestWeightUnitPrice(float32(math.Round(float64(pool.Amount)/float64(pool.TotalWeight)*10000) / 10000))

	return pool, nil
}

func (m *PoolManager) roundForPool(f float32) uint64 {
	return uint64(math.Round(float64(f/10)) * 10)
}

func (m *PoolManager) getTotalWeightForAllPlayers(ctx context.Context) (float32, error) {
	var totalWeight float32

	summaries, err := m.treasureLevelSummaryGetter.Get(ctx)
	if err != nil {
		return 0, fmt.Errorf("get treasure level summaries: %w", err)
	}

	for _, summary := range summaries {
		totalWeight += summary.TotalWeight
	}

	return totalWeight, nil
}

// SetConfig sets config values.
// If the value is nil or negative, it keeps the current value.
func (m *PoolManager) SetConfig(ctx context.Context, poolCeiling *int32, poolFloor *int32, topWeightUnitPrice *float32, bottomWeightUnitPrice *float32, weightPerSilverCard *float32) error {
	repo := rctx.DBContext(ctx)

	settingsConfig, err := repo.Settings(nil).FindConquestV2Pool()
	if err != nil {
		return fmt.Errorf("find conquest v2 pool: %w", err)
	}

	if poolCeiling != nil && *poolCeiling >= 0 {
		settingsConfig.PoolCeiling = *poolCeiling
	}

	if poolFloor != nil && *poolFloor >= 0 {
		settingsConfig.PoolFloor = *poolFloor
	}

	if topWeightUnitPrice != nil && *topWeightUnitPrice >= 0 {
		settingsConfig.TopWeightUnitPrice = *topWeightUnitPrice
	}

	if bottomWeightUnitPrice != nil && *bottomWeightUnitPrice >= 0 {
		settingsConfig.BottomWeightUnitPrice = *bottomWeightUnitPrice
	}

	if weightPerSilverCard != nil && *weightPerSilverCard >= 0 {
		settingsConfig.WeightPerSilverCard = *weightPerSilverCard
	}

	err = repo.Settings(nil).SaveConquestV2Pool(settingsConfig)
	if err != nil {
		return fmt.Errorf("save conquest v2 pool: %w", err)
	}

	return nil
}

// GetConfig gets current configuration contains default, settings and final (merged) values.
// If the settings value is zero, it uses the default value for the final.
func (m *PoolManager) GetConfig(_ context.Context) (*proto.ConquestV2PoolConfig, error) {
	settingsConfig, err := data.DB.Settings(nil).FindConquestV2Pool()
	if err != nil {
		return nil, fmt.Errorf("find conquest v2 pool: %w", err)
	}

	finalConfig := m.makeFinalConfig(m.cfg, settingsConfig)

	return &proto.ConquestV2PoolConfig{
		Default: &proto.ConquestV2PoolConfigData{
			MaxPoolCeiling:        &m.cfg.MaxPoolCeiling,
			PoolCeiling:           m.cfg.PoolCeiling,
			PoolFloor:             m.cfg.PoolFloor,
			TopWeightUnitPrice:    m.cfg.TopWeightUnitPrice,
			BottomWeightUnitPrice: m.cfg.BottomWeightUnitPrice,
			WeightPerSilverCard:   m.cfg.WeightPerSilverCard,
		},
		Settings: &proto.ConquestV2PoolConfigData{
			PoolCeiling:           settingsConfig.PoolCeiling,
			PoolFloor:             settingsConfig.PoolFloor,
			TopWeightUnitPrice:    settingsConfig.TopWeightUnitPrice,
			BottomWeightUnitPrice: settingsConfig.BottomWeightUnitPrice,
			WeightPerSilverCard:   settingsConfig.WeightPerSilverCard,
		},
		Final: &proto.ConquestV2PoolConfigData{
			MaxPoolCeiling:        &finalConfig.maxPoolCeiling,
			PoolCeiling:           finalConfig.poolCeiling,
			PoolFloor:             finalConfig.poolFloor,
			TopWeightUnitPrice:    finalConfig.topWeightUnitPrice,
			BottomWeightUnitPrice: finalConfig.bottomWeightUnitPrice,
			WeightPerSilverCard:   finalConfig.weightPerSilverCard,
		},
	}, nil
}

func (m *PoolManager) makeFinalConfig(def config.OpenSkyConquestV2Config, settings *data.SettingsConquestV2Pool) *finalConfig {
	final := &finalConfig{
		maxPoolCeiling:        def.MaxPoolCeiling,
		poolCeiling:           def.PoolCeiling,
		poolFloor:             def.PoolFloor,
		topWeightUnitPrice:    def.TopWeightUnitPrice,
		bottomWeightUnitPrice: def.BottomWeightUnitPrice,
		weightPerSilverCard:   def.WeightPerSilverCard,
	}

	if settings.PoolCeiling > 0 {
		final.poolCeiling = settings.PoolCeiling
	}

	if settings.PoolFloor > 0 {
		final.poolFloor = settings.PoolFloor
	}

	if settings.TopWeightUnitPrice > 0 {
		final.topWeightUnitPrice = settings.TopWeightUnitPrice
	}

	if settings.BottomWeightUnitPrice > 0 {
		final.bottomWeightUnitPrice = settings.BottomWeightUnitPrice
	}

	if settings.WeightPerSilverCard > 0 {
		final.weightPerSilverCard = settings.WeightPerSilverCard
	}

	return final
}

type finalConfig struct {
	maxPoolCeiling        int32
	poolCeiling           int32
	poolFloor             int32
	topWeightUnitPrice    float32
	bottomWeightUnitPrice float32
	weightPerSilverCard   float32
}

type cachedPool struct {
	Amount      uint64
	TotalWeight float32
	TTL         time.Time
}

// TreasureLevelSummaryGetter provides summary of treasure levels.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/treasure_level_summary_getter.go -package mock . TreasureLevelSummaryGetter
type TreasureLevelSummaryGetter interface {
	Get(context.Context) ([]*proto.ConquestV2TreasureLevelSummary, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/metrics_collector.go -package mock . MetricsCollector
type MetricsCollector interface {
	TrackConquestPoolAmount(uint64)
	TrackConquestTotalWeight(float32)
	TrackConquestTotalWeightPriceTop(uint64)
	TrackConquestTotalWeightPriceBottom(uint64)
	TrackConquestWeightUnitPrice(float32)
}
