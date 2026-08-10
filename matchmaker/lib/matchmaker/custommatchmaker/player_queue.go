package custommatchmaker

import (
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_queue.go -package mock . PlayerQueue
type PlayerQueue interface {
	Push(*player.Player) error
	Items(proto.GameMode) ([]proto.Hash, error)
	Remove(*player.Player) error
}

type playerQueue struct {
	queue queue.Distributor
}

func NewPlayerQueue(queue queue.Distributor) *playerQueue {
	return &playerQueue{
		queue: queue,
	}
}

func (q *playerQueue) Push(p *player.Player) error {
	if err := q.queue.Push(p); err != nil {
		return fmt.Errorf("push to queue: %w", err)
	}

	return nil
}

func (q *playerQueue) Items(gameMode proto.GameMode) ([]proto.Hash, error) {
	gameModeQueue := queue.NewGameModeQueue(gameMode)

	addressStrings, err := q.queue.Items(gameModeQueue.Name())
	if err != nil {
		return nil, fmt.Errorf("get queue items: %w", err)
	}

	var addresses []proto.Hash

	for _, addressString := range addressStrings {
		addresses = append(addresses, proto.HashFromString(addressString))
	}

	return addresses, nil
}

func (q *playerQueue) Remove(p *player.Player) error {
	if !p.Address().IsValidAddress() {
		return fmt.Errorf("invalid address: %w", mmerrors.ErrMissingPlayer)
	}

	if p.Mode == proto.GameMode_UNKNOWN {
		return fmt.Errorf("missing game mode")
	}

	if err := q.queue.Remove(p); err != nil {
		return fmt.Errorf("remove from queue: %w", err)
	}

	return nil
}
