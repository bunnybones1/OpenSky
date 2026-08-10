package penaltytracker

import (
	"errors"
	"fmt"
	"time"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

const (
	refusalPenaltyCountStoreIDFmt  = "match_refusal_count:%s:%s"
	refusalPenaltyStoreIDFmt       = "match_refusal_penalty:%s:%s"
	acceptTimeoutPenaltyStoreIDFmt = "match_accept_timeout_penalty:%s:%s"
	// abandonPenaltyStoreIDFmt is a shared ID also used by game server which sets it.
	abandonPenaltyStoreIDFmt = "match_abandon_cooldown:%s:%s"
)

type Tracker struct {
	keyValStore          store.Store
	acceptTimeoutPenalty time.Duration
	refusalPenaltyWindow time.Duration
	refusalPenaltyMap    []float32
	versionHash          string
}

func NewTracker(cfg *config.Config, keyValStore store.Store) *Tracker {
	return &Tracker{
		keyValStore:          keyValStore,
		acceptTimeoutPenalty: cfg.MatchMaker.MatchAcceptancePenalty,
		refusalPenaltyWindow: cfg.MatchMaker.MatchRefusalWindow,
		refusalPenaltyMap:    cfg.MatchMaker.MatchRefusalPenalty.DefaultSeconds,
		versionHash:          cfg.VersionHash,
	}
}

func (t *Tracker) SetRefusalPenalty(p *player.Player) error {
	// Increase count, when does not exist set to 1.
	count, err := t.keyValStore.Increase(t.refusalPenaltyCountStoreID(p))
	if err != nil {
		return fmt.Errorf("increase count: %w", err)
	}

	if err := t.keyValStore.SetTTL(t.refusalPenaltyCountStoreID(p), t.refusalPenaltyWindow); err != nil {
		return fmt.Errorf("set ttl: %w", err)
	}

	if count == 0 || len(t.refusalPenaltyMap) < 1 {
		return nil
	}

	penaltyIndex := count
	if penaltyIndex > len(t.refusalPenaltyMap) {
		penaltyIndex = len(t.refusalPenaltyMap)
	}

	penalty := time.Duration(t.refusalPenaltyMap[penaltyIndex-1] * float32(time.Second))

	if err := t.keyValStore.StoreTTL(t.refusalPenaltyStoreID(p), nil, penalty); err != nil {
		return fmt.Errorf("store: %w", err)
	}

	return nil
}

func (t *Tracker) getRefusalPenalty(p *player.Player) (time.Duration, error) {
	ttl, err := t.keyValStore.TTL(t.refusalPenaltyStoreID(p))
	if err != nil {
		if errors.Is(err, store.ErrNoSuchItem) {
			return 0, nil
		}

		return 0, fmt.Errorf("ttl: %w", err)
	}

	return ttl, nil
}

func (t *Tracker) DeleteRefusalPenalty(p *player.Player) error {
	if err := t.keyValStore.Delete(t.refusalPenaltyCountStoreID(p)); err != nil {
		return fmt.Errorf("delete counter: %w", err)
	}

	if err := t.keyValStore.Delete(t.refusalPenaltyStoreID(p)); err != nil {
		return fmt.Errorf("delete cooldown: %w", err)
	}

	return nil
}

func (t *Tracker) refusalPenaltyCountStoreID(p *player.Player) string {
	return fmt.Sprintf(refusalPenaltyCountStoreIDFmt, p.Address(), p.Mode.String())
}

func (t *Tracker) refusalPenaltyStoreID(p *player.Player) string {
	return fmt.Sprintf(refusalPenaltyStoreIDFmt, p.Address(), p.Mode.String())
}

func (t *Tracker) SetAcceptTimeoutPenalty(p *player.Player) error {
	if t.acceptTimeoutPenalty == 0 {
		return nil
	}

	if err := t.keyValStore.StoreTTL(t.acceptTimeoutPenaltyStoreID(p), nil, t.acceptTimeoutPenalty); err != nil {
		return fmt.Errorf("store: %w", err)
	}

	return nil
}

func (t *Tracker) getAcceptTimeoutPenalty(p *player.Player) (time.Duration, error) {
	ttl, err := t.keyValStore.TTL(t.acceptTimeoutPenaltyStoreID(p))
	if err != nil {
		if errors.Is(err, store.ErrNoSuchItem) {
			return 0, nil
		}

		return 0, fmt.Errorf("ttl: %w", err)
	}

	return ttl, nil
}

func (t *Tracker) acceptTimeoutPenaltyStoreID(p *player.Player) string {
	return fmt.Sprintf(acceptTimeoutPenaltyStoreIDFmt, p.Address(), p.Mode.String())
}

// GetPenalty provides the highest amount of penalty either from refusal, accept timeout or abandoning.
func (t *Tracker) GetPenalty(p *player.Player) (time.Duration, error) {
	penalty, err := t.getRefusalPenalty(p)
	if err != nil {
		return 0, fmt.Errorf("get refusal penalty: %w", err)
	}

	acceptTimeoutPenalty, err := t.getAcceptTimeoutPenalty(p)
	if err != nil {
		return 0, fmt.Errorf("get accept timeout penalty: %w", err)
	}

	if acceptTimeoutPenalty > penalty {
		penalty = acceptTimeoutPenalty
	}

	abandonPenalty, err := t.getAbandonPenalty(p)
	if err != nil {
		return 0, fmt.Errorf("get abandon penalty: %w", err)
	}

	if abandonPenalty > penalty {
		penalty = abandonPenalty
	}

	return penalty, nil
}

func (t *Tracker) getAbandonPenalty(p *player.Player) (time.Duration, error) {
	ttl, err := t.keyValStore.TTL(t.abandonPenaltyStoreID(p))
	if err != nil {
		if errors.Is(err, store.ErrNoSuchItem) {
			return 0, nil
		}

		return 0, fmt.Errorf("ttl: %w", err)
	}

	return ttl, nil
}

func (t *Tracker) abandonPenaltyStoreID(p *player.Player) string {
	return fmt.Sprintf(abandonPenaltyStoreIDFmt, p.Address(), t.versionHash)
}
