package memqueue

import (
	"fmt"
	"sync"

	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

type memQueue struct {
	items       map[string][]queue.Item
	itemsByName store.Store
	mu          sync.Mutex
}

func NewMemQueue(s store.Store) queue.Distributor {
	return &memQueue{
		items:       make(map[string][]queue.Item),
		itemsByName: s,
	}
}

func (q *memQueue) Item(itemID string) (queue.Item, error) {
	var p player.Player
	if err := q.itemsByName.Load(itemID, &p); err != nil {
		return nil, fmt.Errorf("load: %w", err)
	}
	return &p, nil
}

func (q *memQueue) Size(queueName string) (int, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	return len(q.items[queueName]), nil
}

func (q *memQueue) Items(queueName string) ([]string, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	ids := make([]string, 0, len(q.items[queueName]))
	for _, item := range q.items[queueName] {
		ids = append(ids, item.ID())
	}

	return ids, nil
}

func (q *memQueue) Queues() ([]string, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	queues := make([]string, 0, len(q.items))
	for name := range q.items {
		queues = append(queues, name)
	}
	return queues, nil
}

func (q *memQueue) Push(item queue.Item) error {
	q.mu.Lock()
	defer q.mu.Unlock()

	id := item.ID()

	name := item.Queue().Name()

	ok, err := q.itemsByName.Exists(id)
	if err != nil {
		return err
	}

	if q.items[name] == nil {
		q.items[name] = []queue.Item{}
	}

	if ok {
		for i := range q.items[name] {
			if q.items[name][i].ID() == id {
				q.items[name] = append(q.items[name][:i], q.items[name][i+1:]...)
				break
			}
		}

		_ = q.itemsByName.Delete(id)
	}

	if err := q.itemsByName.Store(id, item); err != nil {
		return err
	}
	q.items[name] = append(q.items[name], item)

	return nil
}

func (q *memQueue) Remove(item queue.Item) error {
	q.mu.Lock()
	defer q.mu.Unlock()

	queueName := item.Queue().Name()

	for i := range q.items[item.Queue().Name()] {
		if item.ID() == q.items[queueName][i].ID() {
			item := q.items[queueName][i]
			q.items[queueName] = append(q.items[queueName][:i], q.items[queueName][i+1:]...)
			_ = q.itemsByName.Delete(item.ID())

			return nil
		}
	}

	return nil
}
