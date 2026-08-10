package matchtrackers

import (
	"errors"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

const (
	recentMatchStoreIDFmt = "recent_match_info:%s"
)

type RecentMatchTracker struct {
	keyValStore store.Store
}

func NewRecentMatchTracker(keyValStore store.Store) *RecentMatchTracker {
	return &RecentMatchTracker{
		keyValStore: keyValStore,
	}
}

func (c *RecentMatchTracker) GetMatch(address proto.Hash) (*messages.RecentMatchInfo, error) {
	var recentMatchInfo messages.RecentMatchInfo

	err := c.keyValStore.Load(c.recentMatchStoreID(address), &recentMatchInfo)
	if err != nil && !errors.Is(err, store.ErrNoSuchItem) {
		return nil, fmt.Errorf("load: %w", err)
	}

	if errors.Is(err, store.ErrNoSuchItem) {
		return nil, nil
	}

	return &recentMatchInfo, nil
}

func (c *RecentMatchTracker) DeleteMatch(addresses ...proto.Hash) error {
	for _, playerID := range addresses {
		if err := c.keyValStore.Delete(c.recentMatchStoreID(playerID)); err != nil {
			return fmt.Errorf("delete: %w", err)
		}
	}

	return nil
}

func (c *RecentMatchTracker) recentMatchStoreID(address proto.Hash) string {
	return fmt.Sprintf(recentMatchStoreIDFmt, address)
}
