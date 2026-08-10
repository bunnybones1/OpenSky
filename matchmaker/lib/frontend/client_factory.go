package frontend

import (
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/client_factory.go -package mock . ClientFactory
type ClientFactory interface {
	Create(wsConn *websocket.Conn, ipAddress string) *Client
}

type clientFactory struct {
	logger zerolog.Logger
}

func NewClientFactory(logger zerolog.Logger) *clientFactory {
	return &clientFactory{
		logger: logger,
	}
}

func (f *clientFactory) Create(wsConn *websocket.Conn, ipAddress string) *Client {
	conn := NewClientConn(wsConn)

	return NewClient(f.logger, conn, ipAddress)
}
