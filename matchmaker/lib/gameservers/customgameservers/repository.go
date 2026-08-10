package customgameservers

import (
	"errors"
	"fmt"
	"strings"

	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

const (
	gameServerRankingStoreID = "game_server_ranking"
)

type serverRepository struct {
	keyValStore store.Store
}

func NewServerRepository(keyValStore store.Store) *serverRepository {
	return &serverRepository{
		keyValStore: keyValStore,
	}
}

func (r *serverRepository) ListByVersion(versionHash string) (serverKeys []string, err error) {
	if versionHash == "" {
		return nil, errors.New("version hash is required")
	}

	servers, err := r.keyValStore.Range(gameServerRankingStoreID)
	if err != nil {
		return nil, fmt.Errorf("no ranked game servers found: %w", err)
	}

	for _, serverKey := range servers {
		if strings.HasSuffix(serverKey, versionHash) {
			serverKeys = append(serverKeys, serverKey)
		}
	}

	return serverKeys, nil
}

func (r *serverRepository) List() (serverKeys []string, err error) {
	serverKeys, err = r.keyValStore.Range(gameServerRankingStoreID)
	if err != nil {
		return nil, fmt.Errorf("no ranked game servers found: %w", err)
	}

	return serverKeys, nil
}

func (r *serverRepository) GetInfo(serverKey string) (*gameservers.GameServerInfo, error) {
	var gameServerInfo gameservers.GameServerInfo

	err := r.keyValStore.Load(serverKey, &gameServerInfo)
	if err != nil && !errors.Is(err, store.ErrNoSuchItem) {
		return nil, fmt.Errorf("load server (%s): %w", serverKey, err)
	}

	if errors.Is(err, store.ErrNoSuchItem) {
		return nil, nil
	}

	return &gameServerInfo, nil
}

func (r *serverRepository) Delete(serverKeys ...string) error {
	if len(serverKeys) == 0 {
		return nil
	}

	if err := r.keyValStore.RangeDelete(gameServerRankingStoreID, serverKeys...); err != nil {
		return fmt.Errorf("range delete: %w", err)
	}

	return nil
}
