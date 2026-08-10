package matchtrackers

import (
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

const (
	matchInProgressStoreIDFmt = "match_in_progress:%s"
	loadingAssetsStoreIDFmt   = "loading_assets:%s"
	abandonMatchStoreIDFmt    = "abandon_match:%s"
)

type MatchInProgressTracker struct {
	keyValStore          store.Store
	gameServerRepository GameServerRepository
}

func NewMatchInProgressTracker(keyValStore store.Store, gameServerRepository GameServerRepository) *MatchInProgressTracker {
	return &MatchInProgressTracker{
		keyValStore:          keyValStore,
		gameServerRepository: gameServerRepository,
	}
}

func (c *MatchInProgressTracker) GetMatch(address proto.Hash) (*messages.InProgressMatchInfo, error) {
	matchInfo, err := c.getMatchInfo(address)
	if err != nil && !errors.Is(err, store.ErrNoSuchItem) {
		return nil, fmt.Errorf("get match info : %w", err)
	}

	if matchInfo == nil || errors.Is(err, store.ErrNoSuchItem) {
		return nil, nil
	}

	if len(matchInfo.ServerLocationKey) == 0 {
		return nil, nil
	}

	gameServerInfo, err := c.gameServerRepository.GetInfo(matchInfo.ServerLocationKey)
	if err != nil {
		return nil, fmt.Errorf("get game server info: %w", err)
	}

	if gameServerInfo == nil || len(gameServerInfo.Name) == 0 {
		return nil, nil
	}

	loadingAssetsTimeout, err := c.keyValStore.TTL(c.loadingAssetsStoreID(address))
	if err != nil && !errors.Is(err, store.ErrNoSuchItem) {
		return nil, fmt.Errorf("ttl loading assets: %w", err)
	}

	abandonTimeout, err := c.keyValStore.TTL(c.abandonMatchStoreID(address))
	if err != nil && !errors.Is(err, store.ErrNoSuchItem) {
		return nil, fmt.Errorf("ttl abandon: %w", err)
	}

	disconnectTimeout := abandonTimeout // abandonTimeout takes precedence by default

	if abandonTimeout > 0 && loadingAssetsTimeout > 0 {
		// if we have both abandonTimeout and loadingAssetsTimeout take the minimum value
		disconnectTimeout = time.Duration(math.Min(float64(abandonTimeout), float64(loadingAssetsTimeout)))
	}

	if disconnectTimeout == 0 {
		// last attempt is using the time left to finish loading assets, if any
		disconnectTimeout = loadingAssetsTimeout
	}

	return messages.InProgressMatchInfoMessage(*matchInfo, *gameServerInfo, disconnectTimeout), nil
}

func (c *MatchInProgressTracker) getMatchInfo(address proto.Hash) (*messages.MatchInfo, error) {
	var matchInfo messages.MatchInfo

	if err := c.keyValStore.Load(c.matchInProgressStoreID(address), &matchInfo); err != nil {
		return nil, fmt.Errorf("load: %w", err)
	}

	return &matchInfo, nil
}

func (c *MatchInProgressTracker) matchInProgressStoreID(address proto.Hash) string {
	return fmt.Sprintf(matchInProgressStoreIDFmt, address)
}

func (c *MatchInProgressTracker) loadingAssetsStoreID(address proto.Hash) string {
	return fmt.Sprintf(loadingAssetsStoreIDFmt, address)
}

func (c *MatchInProgressTracker) abandonMatchStoreID(address proto.Hash) string {
	return fmt.Sprintf(abandonMatchStoreIDFmt, address)
}

type GameServerRepository interface {
	GetInfo(serverKey string) (*gameservers.GameServerInfo, error)
}
