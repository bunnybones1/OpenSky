//go:build redis
// +build redis

package lock_test

import (
	"sync"
	"testing"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
)

var redisClient = redis.NewClient(&redis.Options{
	Addr: "127.0.0.1:6379",
})

func TestLockAndUnlock(t *testing.T) {
	locker := lock.NewRedisLock(redisClient)
	fooMu := locker.New("foo")

	{
		err := fooMu.Lock()
		assert.NoError(t, err)
	}

	{
		unlocked, err := fooMu.Unlock()
		assert.NoError(t, err)
		assert.True(t, unlocked)
	}

	{
		unlocked, err := fooMu.Unlock()
		assert.NoError(t, err)
		assert.False(t, unlocked)
	}
}

func TestConcurrentLockAndUnlock(t *testing.T) {
	var wg sync.WaitGroup

	locker := lock.NewRedisLock(redisClient)
	mu := locker.New("bar")

	var inc int

	times := 200

	for i := 0; i < times; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()

			{
				err := mu.Lock()
				assert.NoError(t, err)
				t.Logf("lock %d: locked", i)
			}

			inc++

			{
				unlocked, err := mu.Unlock()
				assert.NoError(t, err)
				assert.True(t, unlocked)
				t.Logf("lock %d: unlocked", i)
			}
		}(i)
	}

	wg.Wait()

	assert.Equal(t, times, inc)
}
