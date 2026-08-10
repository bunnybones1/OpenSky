package gamemodechecker

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/goware/cachestore"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
)

const cacheStoreKey = "cachedGameModesStatus"

// Checker checks whether the game mode is enabled.
type Checker struct {
	cfg        *config.Config
	openskyAPI SkyWeaverAPI

	cacheStore cachestore.Store[[]byte]
	cacheTTL   time.Duration
	mu         sync.Mutex

	log zerolog.Logger
}

// NewChecker instantiates a new Checker.
func NewChecker(
	cfg *config.Config,
	log zerolog.Logger,
	openskyAPI SkyWeaverAPI,
	cacheStore cachestore.Store[[]byte],
) *Checker {
	return &Checker{
		cfg:        cfg,
		openskyAPI: openskyAPI,
		cacheStore: cacheStore,
		cacheTTL:   cfg.SkyWeaverAPI.GameModesStatusCacheTTL,
		log:        log,
	}
}

// IsEnabled calls API to find out whether the game mode is enabled.
// The result is cached for given amount of time, set up in config.SkyWeaverAPIConfig.
func (c *Checker) IsEnabled(ctx context.Context, mode proto.GameMode) (bool, error) {
	gameModesStatus, err := c.getData(ctx)
	if err != nil {
		return false, fmt.Errorf("get data: %w", err)
	}

	switch mode {
	case proto.GameMode_TUTORIAL:
		return gameModesStatus.Tutorial, nil
	case proto.GameMode_PRACTICE_BOT:
		return gameModesStatus.PracticeBot, nil
	case proto.GameMode_PRACTICE_PVP:
		return gameModesStatus.PracticePVP, nil
	case proto.GameMode_WARM_UP:
		return gameModesStatus.WarmUp, nil
	case proto.GameMode_RANKED_CONSTRUCTED:
		return gameModesStatus.RankedConstructed, nil
	case proto.GameMode_RANKED_DISCOVERY:
		return gameModesStatus.RankedDiscovery, nil
	case proto.GameMode_CONQUEST_CONSTRUCTED:
		return gameModesStatus.ConquestConstructed, nil
	case proto.GameMode_CONQUEST_DISCOVERY:
		return gameModesStatus.ConquestDiscovery, nil
	case proto.GameMode_CHALLENGE_CONSTRUCTED:
		return gameModesStatus.ChallengeConstructed, nil
	case proto.GameMode_CHALLENGE_DISCOVERY:
		return gameModesStatus.ChallengeDiscovery, nil
	default:
		return true, nil
	}
}

func (c *Checker) getData(ctx context.Context) (*proto.GameModesStatus, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.cfg.Testing.GameModesStatusBypassEnabled {
		return &proto.GameModesStatus{
			Tutorial:             true,
			PracticePVP:          true,
			PracticeBot:          true,
			WarmUp:               true,
			RankedConstructed:    true,
			RankedDiscovery:      true,
			ConquestConstructed:  true,
			ConquestDiscovery:    true,
			ChallengeConstructed: true,
			ChallengeDiscovery:   true,
		}, nil
	}

	var gameModesStatus *proto.GameModesStatus

	b, _, err := c.cacheStore.Get(ctx, cacheStoreKey)
	if err != nil {
		c.log.Err(err).Msg("get GameModesStatus from cache store failed")
	}

	if b != nil {
		err = json.Unmarshal(b, &gameModesStatus)
		if err != nil {
			c.log.Err(err).Msg("decode GameModesStatus failed")
		}
	}

	if gameModesStatus == nil {
		gameModesStatus, err = c.openskyAPI.GetGameModesStatus(ctx)
		if err != nil {
			return nil, fmt.Errorf("call API.GetGameModesStatus: %w", err)
		}

		if b, err = json.Marshal(gameModesStatus); err != nil {
			c.log.Err(err).Msg("encode GameModesStatus failed")
		} else {
			err = c.cacheStore.SetEx(ctx, cacheStoreKey, b, c.cacheTTL)
			if err != nil {
				c.log.Err(err).Msg("set GameModesStatus to cache store failed")
			}
		}
	}

	return gameModesStatus, nil
}

// GameModeStatusChecker checks whether the game mode is enabled.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/game_mode_status_checker.go -package mock . GameModeStatusChecker
type GameModeStatusChecker interface {
	IsEnabled(context.Context, proto.GameMode) (bool, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/opensky_api.go -package mock . SkyWeaverAPI
type SkyWeaverAPI interface {
	GetGameModesStatus(context.Context) (*proto.GameModesStatus, error)
}
