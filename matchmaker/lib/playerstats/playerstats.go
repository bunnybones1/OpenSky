package playerstats

import (
	"fmt"
	"sync"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

const (
	playerStatsTTL = time.Second * 3600 * 24 * 7 // keep stats for a week

	expectedSamples = 10
)

type Manager struct {
	mu sync.RWMutex

	store store.Store
}

func NewPlayerStatsManager(store store.Store) *Manager {
	if store == nil {
		panic("missing store")
	}
	return &Manager{store: store}
}

// Push adds a stat sample to a given player
func (m *Manager) Push(address proto.Hash, s *Stat) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if s == nil {
		return fmt.Errorf("stats cannot be nil")
	}

	s.Timestamp = time.Now()

	summary, err := m.retrievePlayerStats(address)
	if err != nil {
		return fmt.Errorf("failed to retrieve player stats: %w", err)
	}

	summary.Stats = append(summary.Stats, *s)
	if len(summary.Stats) > expectedSamples {
		summary.Stats = summary.Stats[len(summary.Stats)-expectedSamples:]
	}

	updateSummaryAggregatedValues(summary)

	return m.persistPlayerStats(address, summary)
}

// Retrieve returns match stats for a given player
func (m *Manager) Retrieve(address proto.Hash) (*StatsSummary, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	summary, err := m.retrievePlayerStats(address)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve player stats: %w", err)
	}
	return summary, nil
}

func (m *Manager) persistPlayerStats(address proto.Hash, summary *StatsSummary) error {
	err := m.store.StoreTTL(playerStatsKey(address), summary, playerStatsTTL)
	if err != nil {
		return err
	}
	return nil
}

func (m *Manager) retrievePlayerStats(address proto.Hash) (*StatsSummary, error) {
	var summary *StatsSummary
	err := m.store.Load(playerStatsKey(address), &summary)
	switch err {
	case nil:
		return summary, nil
	case store.ErrNoSuchItem:
		return &StatsSummary{
			VsHeroProbability:   map[proto.Hero]float64{},
			VsPlayerProbability: map[proto.Hash]float64{},
			Stats:               []Stat{},
		}, nil
	default:
		return nil, err
	}
}

func playerStatsKey(address proto.Hash) string {
	return fmt.Sprintf("matchmaker_player_stats:%s", address)
}

// updateSummaryAggregatedValues recalculates the fields with aggregated data
func updateSummaryAggregatedValues(summary *StatsSummary) {
	summary.VsHeroProbability = map[proto.Hero]float64{}
	summary.VsPlayerProbability = map[proto.Hash]float64{}

	for _, stat := range summary.Stats {
		summary.VsHeroProbability[stat.OpponentHero] += 1
		summary.VsPlayerProbability[stat.OpponentID] += 1
	}

	for hero := range summary.VsHeroProbability {
		summary.VsHeroProbability[hero] = summary.VsHeroProbability[hero] / float64(expectedSamples)
	}

	for player := range summary.VsPlayerProbability {
		summary.VsPlayerProbability[player] = summary.VsPlayerProbability[player] / float64(expectedSamples)
	}
}

// Manager saves player stats
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_stats_manager.go -package mock . PlayerStatsManager
type PlayerStatsManager interface {
	Push(proto.Hash, *Stat) error
	Retrieve(proto.Hash) (*StatsSummary, error)
}
