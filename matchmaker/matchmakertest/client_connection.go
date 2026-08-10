package matchmakertest

import (
	"math/rand"
)

type clientConnNop struct {
	id   uint64
	done chan struct{}
}

func NewClientConnNop() *clientConnNop {
	return &clientConnNop{
		id:   uint64(rand.Int63()),
		done: make(chan struct{}),
	}
}

func (c *clientConnNop) ID() uint64 {
	return c.id
}

func (c *clientConnNop) ReadJSON(_ any) ([]byte, error) {
	return nil, nil
}

func (c *clientConnNop) WriteJSON(_ any) error {
	return nil
}

func (c *clientConnNop) Done() <-chan struct{} {
	return c.done
}

func (c *clientConnNop) Close() error {
	select {
	case <-c.Done():
		return nil
	default:
	}

	close(c.done)

	return nil
}
