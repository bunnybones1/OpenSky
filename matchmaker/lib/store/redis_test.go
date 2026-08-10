//go:build redis
// +build redis

package store_test

import (
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

var redisClient = redis.NewClient(&redis.Options{
	Addr: "127.0.0.1:6379",
})

func TestMissingKey(t *testing.T) {
	s, err := store.NewRedisStore(redisClient)
	assert.NoError(t, err)

	{
		err := s.Delete("missing_key")
		assert.NoError(t, err)
	}

	{
		err := s.Load("missing_key", nil)
		assert.Error(t, err)
		assert.Equal(t, ErrNoSuchItem, err)
	}

	{
		err := s.MapLoad("missing_key", "missing_property", nil)
		assert.Error(t, err)
		assert.Equal(t, ErrNoSuchItem, err)
	}

	{
		_, err := s.TTL("missing_key")
		assert.Error(t, err)
		assert.Equal(t, ErrNoSuchItem, err)
	}

	{
		err := s.SetTTL("missing_key", time.Second)
		assert.Error(t, err)
		assert.Equal(t, ErrNoSuchItem, err)
	}

	{
		_, err := s.Increase("missing_key")
		assert.NoError(t, err)
	}
}
