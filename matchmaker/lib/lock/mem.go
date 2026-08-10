package lock

import (
	"sync"
)

var (
	sharedLocksMu sync.Mutex
	sharedLocks   = map[string]*muLock{}
)

// NewMemLock returns a non-distributed memory-based lock that satisfies the
// Locker interface.
func NewMemLock() Locker {
	return &memLocker{}
}

type memLocker struct {
}

func (memLocker) New(name string) Mutex {
	sharedLocksMu.Lock()
	defer sharedLocksMu.Unlock()

	lock, ok := sharedLocks[name]
	if ok {
		return lock
	}

	lock = &muLock{}
	sharedLocks[name] = lock
	return lock
}

type muLock struct {
	sync.Mutex
}

func (m *muLock) Lock() error {
	m.Mutex.Lock()
	return nil
}

func (m *muLock) Unlock() (bool, error) {
	m.Mutex.Unlock()
	return true, nil
}
