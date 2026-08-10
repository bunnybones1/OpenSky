package queue

import (
	"github.com/horizon-games/OpenSky/api/proto"
)

// Distributor represents a set of queues with special rules for item
// distribution
type Distributor interface {
	// Push adds an item to the end of the queue. If the item is already in the
	// queue this method is a no-op.
	Push(item Item) error
	// Remove removes the item from the queue
	Remove(item Item) error
	// Items returns all the items from the queue in random order
	Items(queueName string) ([]string, error)
	// Item retrieves an item from the storage
	Item(itemID string) (Item, error)
	// Size returns the number of elements in the queue
	Size(queueName string) (int, error)
	// Queues returns the names of the queues
	Queues() ([]string, error)
}

type Item interface {
	ID() string   // unique ID of the item
	Queue() Queue // queue the item belongs to
}

type Queue interface {
	Name() string
}

type GameModeQueue struct {
	name     string
	gameMode proto.GameMode
}

func NewGameModeQueue(gameMode proto.GameMode) *GameModeQueue {
	return &GameModeQueue{
		name:     gameMode.String(),
		gameMode: gameMode,
	}
}

func (q GameModeQueue) Name() string {
	return q.name
}

func (q GameModeQueue) GameMode() proto.GameMode {
	return q.gameMode
}
