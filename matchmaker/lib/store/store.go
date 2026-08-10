package store

import (
	"errors"
	"time"
)

// Store represents a store where we can put and retrieve data.
type Store interface {
	// Get retrieves and returns data from storage
	Load(id string, dest interface{}) error
	// Store saves or updates data with a default TTL.
	Store(id string, value interface{}) error
	// MapLoad
	MapLoad(id string, key string, dest interface{}) error
	// MapStore stores a property associated to an id.
	MapStore(id string, key string, value interface{}) error
	// Exists returns true if the key aready exists in the store
	Exists(id string) (bool, error)
	// Delete removes an item from the store
	Delete(id string) error // UNLINK?
	// StoreTTL saves or updates data with a TTL
	StoreTTL(id string, value interface{}, ttl time.Duration) error
	// Range returns a list of elements sorted by score
	Range(list string) ([]string, error)
	// RangeDelete deletes members from a sorted list
	RangeDelete(list string, members ...string) error
	// Increase increases the integer data for the key by 1, returns increased data and error
	// if key doesnt exist, it sets it with value 1
	Increase(id string) (int, error)
	// SetTTL sets expiry for the key
	SetTTL(id string, ttl time.Duration) error
	// TTL gets time left till expiry
	TTL(id string) (time.Duration, error)
}

var (
	ErrNoSuchItem = errors.New("no such item")
	ErrItemNotInt = errors.New("item is not an integer")
)
