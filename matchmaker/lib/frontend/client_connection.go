package frontend

import (
	"encoding/json"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

var connID uint64

var legacyPingMessage = []byte(`{"type":"ping"}`)

var (
	// TODO: this is a pretty long time because webapp is unable to keep sending
	// ping messages if the browser tab is not focused (seems to be a setInterval
	// thing), we don't want to disconnect while waiting for a match, I believe
	// we could improve this situation and reduce this read timeout value by
	// pinging the client ourselves and expecting a quick response.
	readTimeout = time.Second * 120

	writeTimeout = time.Second * 20

	readMaxLength = int64(1024 * 32)
)

type ClientConn interface {
	ID() uint64
	ReadJSON(v any) ([]byte, error)
	WriteJSON(v any) error
	Done() <-chan struct{}
	Close() error
}

type clientConn struct {
	id uint64

	ws *websocket.Conn
	mu sync.Mutex

	done chan struct{}
}

func NewClientConn(ws *websocket.Conn) *clientConn {
	conn := &clientConn{
		id:   atomic.AddUint64(&connID, 1),
		ws:   ws,
		done: make(chan struct{}),
	}

	conn.ws.SetCloseHandler(func(code int, text string) error {
		conn.Close()
		return nil
	})

	conn.ws.SetReadLimit(readMaxLength)

	return conn
}

func (c *clientConn) ID() uint64 {
	return c.id
}

func (c *clientConn) ReadJSON(v any) ([]byte, error) {
	// TODO: make it configurable
	if err := c.ws.SetReadDeadline(time.Now().Add(readTimeout)); err != nil {
		return nil, fmt.Errorf("error setting read deadline: %w", err)
	}

	_, buf, err := c.ws.ReadMessage()
	if err != nil {
		return nil, err
	}

	// special case, "PING" messages are not JSON.
	if string(buf) == "PING" {
		buf = legacyPingMessage
	}

	return buf, json.Unmarshal(buf, v)
}

func (c *clientConn) WriteJSON(v any) error {
	buf, err := json.Marshal(v)
	if err != nil {
		return err
	}

	// TODO: make it configurable
	if err := c.ws.SetWriteDeadline(time.Now().Add(writeTimeout)); err != nil {
		return fmt.Errorf("error setting write deadline: %w", err)
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	err = c.ws.WriteMessage(websocket.TextMessage, buf)

	return err
}

func (c *clientConn) Done() <-chan struct{} {
	return c.done
}

func (c *clientConn) Close() error {
	select {
	case <-c.Done():
		return nil
	default:
	}

	close(c.done)

	if c.ws != nil {
		return c.ws.Close()
	}

	return nil
}
