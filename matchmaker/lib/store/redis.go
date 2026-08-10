package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// defaultKeyExpiry is the default TTL for keys with no explicit expiration
var defaultKeyExpiry = time.Second * 3600 * 4

type redisStore struct {
	conn     *redis.Client
	deadline time.Duration
}

func NewRedisStore(conn *redis.Client) (Store, error) {
	return &redisStore{
		conn:     conn,
		deadline: time.Second * 10,
	}, nil
}

func (s *redisStore) MapLoad(id string, key string, dest interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	buf, err := s.conn.HGet(ctx, id, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return ErrNoSuchItem
		}
		return fmt.Errorf("HGET: %w", err)
	}

	if err := json.Unmarshal(buf, dest); err != nil {
		return fmt.Errorf("Unmarshal: %w", err)
	}

	return nil
}

func (s *redisStore) Load(id string, dest interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	buf, err := s.conn.Get(ctx, id).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return ErrNoSuchItem
		}
		return fmt.Errorf("GET: %w", err)
	}

	if err := json.Unmarshal(buf, dest); err != nil {
		return fmt.Errorf("Unmarshal: %w", err)
	}

	return nil
}

func (s *redisStore) MapStore(id string, key string, value interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	buf, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("json.Marshal: %w", err)
	}

	_, err = s.conn.HSet(ctx, id, key, buf).Uint64()
	if err != nil {
		return fmt.Errorf("HSET: %w", err)
	}

	ttl, err := s.conn.TTL(ctx, id).Result()
	if err != nil {
		return fmt.Errorf("TTL: %w", err)
	}
	if ttl < 0 {
		// use EXPIRE only if the map doesn't have an expiry yet (which happens
		// when the property doesn't exists), we don't want to update the TTL
		// everytime we set the value of a property.
		_, err = s.conn.Expire(ctx, id, defaultKeyExpiry).Result()
		if err != nil {
			return fmt.Errorf("EXPIRE: %w", err)
		}
	}

	return nil
}

func (s *redisStore) Store(id string, value interface{}) error {
	return s.StoreTTL(id, value, defaultKeyExpiry)
}

func (s *redisStore) Exists(id string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	exists, err := s.conn.Exists(ctx, id).Uint64()
	if err != nil {
		return false, fmt.Errorf("EXISTS: %w", err)
	}
	return exists > 0, nil
}

func (s *redisStore) StoreTTL(id string, value interface{}, ttl time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	buf, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("json.Marshal: %w", err)
	}

	_, err = s.conn.SetEx(ctx, id, buf, ttl).Result()
	if err != nil {
		return fmt.Errorf("SETEX: %w (ttl: %v)", err, ttl)
	}

	return nil
}

func (s *redisStore) Range(list string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	keys, err := s.conn.ZRangeByScore(ctx, list, &redis.ZRangeBy{Min: "0", Max: "+inf"}).Result()
	if err != nil {
		return nil, fmt.Errorf("failed getting range: %w", err)
	}

	return keys, nil
}

func (s *redisStore) RangeDelete(list string, members ...string) error {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	keys := make([]interface{}, len(members))
	for i, key := range members {
		keys[i] = key
	}

	_, err := s.conn.ZRem(ctx, list, keys...).Result()
	return err
}

func (s *redisStore) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	_, err := s.conn.Del(ctx, id).Result()
	if err != nil {
		return fmt.Errorf("DEL: %w", err)
	}
	return nil
}

func (s *redisStore) SetTTL(id string, ttl time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	done, err := s.conn.Expire(ctx, id, ttl).Result()
	if err != nil {
		return fmt.Errorf("EXPIRE: %w", err)
	}

	if !done {
		return ErrNoSuchItem
	}

	return nil
}

func (s *redisStore) Increase(id string) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	val, err := s.conn.Incr(ctx, id).Result()
	if err != nil {
		return 0, fmt.Errorf("INCR: %w", err)
	}

	return int(val), nil
}

func (s *redisStore) TTL(id string) (time.Duration, error) {
	ctx, cancel := context.WithTimeout(context.Background(), s.deadline)
	defer cancel()

	val, err := s.conn.TTL(ctx, id).Result()
	if err != nil {
		return 0, fmt.Errorf("TTL: %w", err)
	}
	if val < 0 {
		return 0, ErrNoSuchItem
	}

	return val, nil
}
