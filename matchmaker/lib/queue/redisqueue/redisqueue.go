package redisqueue

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

var keySuffix = config.ReleaseVersion()

const (
	matchQueuesKeyFmt = "matchmaker_queues:%s"
	matchQueueKeyFmt  = "matchmaker_queue:%s:%s"
	matchItemKeyFmt   = "matchmaker_queue_item:%s:%s"
)

type redisQueue struct {
	mu sync.Mutex

	conn     *redis.Client
	store    store.Store
	deadline time.Duration
}

func NewRedisQueue(conn *redis.Client) (queue.Distributor, error) {
	store, err := store.NewRedisStore(conn)
	if err != nil {
		return nil, err
	}
	return &redisQueue{
		conn:     conn,
		store:    store,
		deadline: time.Second * 10,
	}, nil
}

func (q *redisQueue) Queues() ([]string, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), q.deadline)
	defer cancel()

	queues, err := q.conn.SMembers(ctx, matchQueuesKey()).Result()
	if err != nil {
		return nil, fmt.Errorf("SMEMBERS: %w", err)
	}

	return queues, nil
}

func (q *redisQueue) Size(queueName string) (int, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), q.deadline)
	defer cancel()

	size, err := q.conn.SCard(ctx, matchQueueKey(queueName)).Uint64()
	if err != nil {
		return 0, fmt.Errorf("SCARD %w", err)
	}

	return int(size), nil
}

func (q *redisQueue) Items(queueName string) ([]string, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), q.deadline)
	defer cancel()

	items, err := q.conn.SMembers(ctx, matchQueueKey(queueName)).Result()
	if err != nil {
		return nil, fmt.Errorf("SMEMBERS: %w", err)
	}

	return items, nil
}

func (q *redisQueue) Remove(item queue.Item) error {
	var err error

	q.mu.Lock()
	defer q.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), q.deadline)
	defer cancel()

	itemID := item.ID()

	// remove from queue
	_, err = q.conn.SRem(ctx, matchQueueKey(item.Queue().Name()), itemID).Uint64()
	if err != nil {
		return err
	}

	// remove item
	err = q.store.Delete(matchItemKey(itemID))
	if err != nil {
		return err
	}

	return err
}

func (q *redisQueue) Push(item queue.Item) error {
	q.mu.Lock()
	defer q.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), q.deadline)
	defer cancel()

	itemID := item.ID()

	ok, err := q.store.Exists(matchItemKey(itemID))
	if err != nil {
		// already in a queue
		return err
	}

	if ok {
		_, err = q.conn.SRem(ctx, matchQueueKey(item.Queue().Name()), itemID).Uint64()
		if err != nil {
			return fmt.Errorf("SREM: %w", err)
		}
		if err = q.store.Delete(matchItemKey(itemID)); err != nil {
			return err
		}
	}

	if err := q.store.Store(matchItemKey(itemID), item); err != nil {
		return err
	}

	// add item to queue
	_, err = q.conn.SAdd(ctx, matchQueueKey(item.Queue().Name()), itemID).Uint64()
	if err != nil {
		return fmt.Errorf("add item to queue: %w", err)
	}

	// add queue to list of queues
	_, err = q.conn.SAdd(ctx, matchQueuesKey(), item.Queue().Name()).Uint64()
	if err != nil {
		return fmt.Errorf("add queue to list of queues: %w", err)
	}

	return nil
}

func (q *redisQueue) Item(itemID string) (queue.Item, error) {
	var p player.Player
	if err := q.store.Load(matchItemKey(itemID), &p); err != nil {
		return nil, fmt.Errorf("load: %w", err)
	}
	return &p, nil
}

func matchItemKey(itemID string) string {
	return fmt.Sprintf(matchItemKeyFmt, itemID, keySuffix)
}

func matchQueueKey(queue string) string {
	return fmt.Sprintf(matchQueueKeyFmt, queue, keySuffix)
}

func matchQueuesKey() string {
	return fmt.Sprintf(matchQueuesKeyFmt, keySuffix)
}
