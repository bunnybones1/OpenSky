package matchers

import (
	"fmt"
	"sort"

	"github.com/rs/zerolog"
	"gonum.org/v1/gonum/stat/combin"

	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type playerCombinator struct {
	logger            zerolog.Logger
	botMatchValidator MatchValidator
	matchValidators   []MatchValidator
}

func NewPlayerCombinator(
	logger zerolog.Logger,
	botMatchValidator MatchValidator,
	matchValidators ...MatchValidator,
) *playerCombinator {
	return &playerCombinator{
		logger:            logger.With().Str("fn", "matchfuncs.PlayerCombinator").Logger(),
		botMatchValidator: botMatchValidator,
		matchValidators:   matchValidators,
	}
}

func (c *playerCombinator) Combine(players []*player.Player) (*PlayerCombinationMap, error) {
	if len(players) < 2 {
		return nil, fmt.Errorf("expecting at least 2 players, got %d", len(players))
	}

	// give priority to players with longer wait times
	sort.SliceStable(players, func(i, j int) bool {
		p1, p2 := players[i], players[j]
		return p1.WaitTime() > p2.WaitTime()
	})

	combinations := NewPlayerCombinationMap()

	pairs := c.combinePlayers(players)

	for i := range pairs {
		p1, p2 := pairs[i][0], pairs[i][1]

		if p1.Address() == p2.Address() {
			continue
		}

		if p1.IsBot() || p2.IsBot() {
			isValid, err := c.botMatchValidator.IsValid(p1, p2)
			if err != nil {
				c.logger.Err(err).Msg("bot match validation")

				continue
			}

			if !isValid {
				continue
			}
		} else {
			isValid, err := c.isValid(p1, p2)
			if err != nil {
				c.logger.Err(err).Msg("validate")

				continue
			}

			if !isValid {
				continue
			}
		}

		combinations.Add(p1, p2)
	}

	return combinations, nil
}

func (c *playerCombinator) combinePlayers(players []*player.Player) [][2]*player.Player {
	combinations := combin.Combinations(len(players), 2)

	pairs := make([][2]*player.Player, len(combinations))

	for i, pair := range combinations {
		pairs[i] = [2]*player.Player{players[pair[0]], players[pair[1]]}
	}

	return pairs
}

func (c *playerCombinator) isValid(p1, p2 *player.Player) (bool, error) {
	for i := 0; i < len(c.matchValidators); i++ {
		validator := c.matchValidators[i]

		isValid, err := validator.IsValid(p1, p2)
		if err != nil {
			return false, fmt.Errorf("validator #%d: %w", i, err)
		}

		if !isValid {
			return false, nil
		}
	}

	return true, nil
}

type PlayerCombinationMap struct {
	players []*player.Player
	matches map[*player.Player]map[*player.Player]bool
}

func NewPlayerCombinationMap() *PlayerCombinationMap {
	return &PlayerCombinationMap{
		matches: map[*player.Player]map[*player.Player]bool{},
		players: []*player.Player{},
	}
}

func (m *PlayerCombinationMap) Candidates(p *player.Player) []*player.Player {
	if m.matches[p] == nil {
		return nil
	}

	candidates := make([]*player.Player, 0, len(m.matches[p]))

	for _, c := range m.players {
		if m.matches[p][c] {
			candidates = append(candidates, c)
		}
	}

	return candidates
}

func (m *PlayerCombinationMap) removeFromSlice(r *player.Player) {
	for j := range m.players {
		if r == m.players[j] {
			m.players = append(m.players[:j], m.players[j+1:]...)
			return
		}
	}
}

func (m *PlayerCombinationMap) Remove(r *player.Player) {
	// delete from right side
	for p := range m.matches {
		delete(m.matches[p], r)
	}
	m.removeFromSlice(r)

	// delete from left side
	for p := range m.matches {
		if p == r || len(m.matches[p]) == 0 {
			delete(m.matches, p)
			m.removeFromSlice(p)
		}
	}
}

func (m *PlayerCombinationMap) Players() []*player.Player {
	return m.players
}

func (m *PlayerCombinationMap) Add(p1, p2 *player.Player) {
	if m.matches[p1] == nil {
		m.matches[p1] = map[*player.Player]bool{}
		m.players = append(m.players, p1)
	}

	if m.matches[p2] == nil {
		m.matches[p2] = map[*player.Player]bool{}
		m.players = append(m.players, p2)
	}

	m.matches[p1][p2] = true
	m.matches[p2][p1] = true
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_validator.go -package mock . MatchValidator
type MatchValidator interface {
	IsValid(*player.Player, *player.Player) (bool, error)
}
