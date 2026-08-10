package frontend

import (
	"fmt"
	"sync"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
)

type Client struct {
	id        uuid.UUID
	conn      ClientConn
	ipAddress string
	done      chan struct{}
	logger    *zerolog.Logger
	mu        sync.Mutex

	player  *player.Player
	channel *playerchannel.PlayerChannel
}

func NewClient(logger zerolog.Logger, conn ClientConn, ipAddress string) *Client {
	client := &Client{
		id:        uuid.New(),
		conn:      conn,
		ipAddress: ipAddress,
		done:      make(chan struct{}),
	}

	logger = logger.With().
		Uint64("connID", conn.ID()).
		Str("clientID", client.ShortID()).
		Str("ip", client.ipAddress).
		Logger()

	client.logger = &logger

	return client
}

func (c *Client) Done() <-chan struct{} {
	return c.done
}

func (c *Client) Log() *zerolog.Logger {
	return c.logger
}

func (c *Client) ShortID() string {
	return c.id.String()[0:8]
}

func (c *Client) HasPlayer() bool {
	return c.player != nil
}

func (c *Client) SetPlayer(p *player.Player) {
	p.IPAddress = c.ipAddress
	c.player = p
}

func (c *Client) Player() *player.Player {
	return c.player
}

func (c *Client) HasChannel() bool {
	return c.channel != nil
}

func (c *Client) SetChannel(channel *playerchannel.PlayerChannel) {
	c.channel = channel
}

func (c *Client) Channel() *playerchannel.PlayerChannel {
	return c.channel
}

func (c *Client) WriteJSON(v any) error {
	if err := c.conn.WriteJSON(v); err != nil {
		return fmt.Errorf("write json to connection: %w", err)
	}

	return nil
}

func (c *Client) ReadJSON(v any) ([]byte, error) {
	return c.conn.ReadJSON(v)
}

func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	select {
	case <-c.Done():
		return nil
	default:
	}

	close(c.done)

	if c.HasChannel() {
		c.channel.Close()
	}

	if c.conn != nil {
		if err := c.conn.Close(); err != nil {
			c.Log().Warn().Err(err).Msg("failed to close websocket connection gracefully")
			return err
		}
	}

	return nil
}
