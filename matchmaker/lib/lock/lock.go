// package lock provides an interface that defines a distributed lock

package lock

type Mutex interface {
	Lock() error
	Unlock() (bool, error)
}

type Locker interface {
	New(name string) Mutex
}
