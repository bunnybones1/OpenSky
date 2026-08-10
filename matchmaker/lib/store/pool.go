package store

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/redis/go-redis/v9"
)

func NewRedisClient(c config.RedisConfig) (*redis.Client, error) {
	addr := fmt.Sprintf("%s:%d", c.Host, c.Port)

	client := redis.NewClient(&redis.Options{
		Addr:            addr,
		MinIdleConns:    c.MaxIdle, // TODO: change config name
		PoolSize:        c.MaxActive,
		ConnMaxIdleTime: c.IdleTimeout,
		OnConnect: func(ctx context.Context, conn *redis.Conn) error {
			status := conn.Ping(ctx)
			return status.Err()
		},
	})

	return client, nil
}
