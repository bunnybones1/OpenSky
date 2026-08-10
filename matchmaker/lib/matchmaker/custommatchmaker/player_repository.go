package custommatchmaker

import (
	"errors"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

const (
	playerStoreIDFmt     = "mm_player:%s:%s"
	propertiesStoreIDFmt = "player_properties:%s"
	propertyStatusKey    = "status"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_repository.go -package mock . PlayerRepository
type PlayerRepository interface {
	Save(*player.Player) error
	Load(proto.Hash) (*player.Player, error)
	Delete(*player.Player) error
	SetStatus(*player.Player, player.PlayerStatus) error
	GetStatus(*player.Player) (player.PlayerStatus, error)
}

type playerRepository struct {
	keyValStore store.Store
	versionHash string
}

func NewPlayerRepository(cfg *config.Config, keyValStore store.Store) *playerRepository {
	return &playerRepository{
		keyValStore: keyValStore,
		versionHash: cfg.VersionHash,
	}
}

func (r *playerRepository) Save(p *player.Player) error {
	if p == nil {
		return fmt.Errorf("player cannot be nil")
	}

	if err := r.keyValStore.Store(r.playerStoreID(p.Address()), p); err != nil {
		return fmt.Errorf("store: %w", err)
	}

	return nil
}

func (r *playerRepository) Load(address proto.Hash) (*player.Player, error) {
	var p *player.Player

	if err := r.keyValStore.Load(r.playerStoreID(address), &p); err != nil {
		if errors.Is(err, store.ErrNoSuchItem) {
			return nil, mmerrors.ErrMissingPlayer
		}

		return nil, fmt.Errorf("load: %w", err)
	}

	return p, nil
}

func (r *playerRepository) Delete(p *player.Player) error {
	if err := r.keyValStore.Delete(r.playerStoreID(p.Address())); err != nil {
		return fmt.Errorf("delete: %w", err)
	}

	return nil
}

func (r *playerRepository) playerStoreID(address proto.Hash) string {
	return fmt.Sprintf(playerStoreIDFmt, address, r.versionHash)
}

func (r *playerRepository) SetStatus(p *player.Player, status player.PlayerStatus) error {
	if err := r.keyValStore.MapStore(r.propertiesStoreID(p), propertyStatusKey, status); err != nil {
		return fmt.Errorf("store map: %w", err)
	}

	return nil
}

func (r *playerRepository) GetStatus(p *player.Player) (player.PlayerStatus, error) {
	var status player.PlayerStatus

	err := r.keyValStore.MapLoad(r.propertiesStoreID(p), propertyStatusKey, &status)
	if err != nil {
		return player.PlayerStatus_ERROR, fmt.Errorf("load map: %w", err)
	}

	return status, nil
}

func (r *playerRepository) propertiesStoreID(p *player.Player) string {
	return fmt.Sprintf(propertiesStoreIDFmt, p.Address())
}
