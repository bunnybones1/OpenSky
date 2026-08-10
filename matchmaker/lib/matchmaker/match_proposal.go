package matchmaker

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type MatchProposal struct {
	data MatchProposalData

	Players []*player.Player `json:"-"`
	timeout *time.Duration

	mu sync.Mutex
}

func NewMatchProposal(players ...*player.Player) *MatchProposal {
	addresses := make([]proto.Hash, len(players))
	gameModes := make(map[proto.GameMode]bool)

	for i, p := range players {
		addresses[i] = p.Address()
		gameModes[p.Mode] = true
	}

	proposal := &MatchProposal{
		data: MatchProposalData{
			ID:        uuid.NewString(),
			Addresses: addresses,
			GameModes: gameModes,
			Accepted:  make(map[proto.Hash]bool),
		},
		Players: players,
	}

	proposal.SetFound()

	return proposal
}

func NewMatchProposalWithData(data MatchProposalData) *MatchProposal {
	return &MatchProposal{
		data: data,
	}
}

func (mp *MatchProposal) ID() string {
	return mp.data.ID
}

func (mp *MatchProposal) Addresses() []proto.Hash {
	return mp.data.Addresses
}

func (mp *MatchProposal) Opponent(p1 *player.Player) (*player.Player, error) {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	if len(mp.Addresses()) == 0 {
		return nil, fmt.Errorf("there are not players")
	}

	if len(mp.Addresses()) > 2 {
		return nil, fmt.Errorf("there are more than 2 players")
	}

	if len(mp.Players) == 0 {
		return nil, fmt.Errorf("players are not loaded")
	}

	for _, p2 := range mp.Players {
		if p1.Address() != p2.Address() {
			return p2, nil
		}
	}

	return nil, fmt.Errorf("oppononent not found")
}

func (mp *MatchProposal) GameModes() map[proto.GameMode]bool {
	return mp.data.GameModes
}

func (mp *MatchProposal) Data() MatchProposalData {
	return mp.data
}

func (mp *MatchProposal) AcceptByPlayer(p *player.Player) {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	mp.data.Accepted[p.Address()] = true
}

func (mp *MatchProposal) HasAccepted(address proto.Hash) bool {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	return mp.data.Accepted[address]
}

func (mp *MatchProposal) HaveAllAccepted() bool {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	for _, p := range mp.data.Addresses {
		if !mp.data.Accepted[p] {
			return false
		}
	}

	return true
}

func (mp *MatchProposal) SetFound() {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	mp.data.Status = MatchProposalStatusFound
}

func (mp *MatchProposal) IsFound() bool {
	return mp.data.Status == MatchProposalStatusFound
}

func (mp *MatchProposal) SetAccepted() {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	mp.data.Status = MatchProposalStatusAccepted
}

func (mp *MatchProposal) IsAccepted() bool {
	return mp.data.Status == MatchProposalStatusAccepted
}

func (mp *MatchProposal) SetToBeMade() {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	mp.data.Status = MatchProposalStatusToBeMade
}

func (mp *MatchProposal) IsToBeMade() bool {
	return mp.data.Status == MatchProposalStatusToBeMade
}

func (mp *MatchProposal) PlayersCount() int {
	return len(mp.data.Addresses)
}

func (mp *MatchProposal) IsConquest() bool {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	for gameMode, ok := range mp.GameModes() {
		if !ok {
			continue
		}

		if gameMode == proto.GameMode_CONQUEST_CONSTRUCTED || gameMode == proto.GameMode_CONQUEST_DISCOVERY {
			return true
		}
	}

	return false
}

func (mp *MatchProposal) IsChallenge() bool {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	for gameMode, ok := range mp.GameModes() {
		if !ok {
			continue
		}

		if gameMode == proto.GameMode_CHALLENGE_CONSTRUCTED || gameMode == proto.GameMode_CHALLENGE_DISCOVERY {
			return true
		}
	}

	return false
}

func (mp *MatchProposal) SetTimeout(d time.Duration) {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	mp.timeout = &d
}

func (mp *MatchProposal) Timeout() *time.Duration {
	return mp.timeout
}

type MatchProposalData struct {
	ID        string                  `json:"id"`
	Addresses []proto.Hash            `json:"player_ids"`
	GameModes map[proto.GameMode]bool `json:"game_modes"`
	Accepted  map[proto.Hash]bool     `json:"accepted"`
	Status    MatchProposalStatus     `json:"status"`
}

type MatchProposalStatus int

const (
	MatchProposalStatusFound    MatchProposalStatus = 1
	MatchProposalStatusAccepted MatchProposalStatus = 2
	MatchProposalStatusToBeMade MatchProposalStatus = 3
)
