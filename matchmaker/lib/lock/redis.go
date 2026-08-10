package lock

import (
	"github.com/go-redsync/redsync/v4"
	"github.com/go-redsync/redsync/v4/redis/goredis/v9"
	"github.com/redis/go-redis/v9"
	"time"
)

type redisLock struct {
	rs *redsync.Redsync
}

// NewRedisLock returns a redis-based Locker.
func NewRedisLock(client *redis.Client) Locker {
	pool := goredis.NewPool(client)
	rs := redsync.New(pool)
	return &redisLock{
		rs: rs,
	}
}

func (r *redisLock) New(name string) Mutex {
	return r.rs.NewMutex(
		name,
		redsync.WithTries(20),
		redsync.WithRetryDelay(time.Second),
	)
}
