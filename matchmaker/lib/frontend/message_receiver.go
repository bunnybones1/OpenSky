package frontend

import (
	"fmt"

	"github.com/gorilla/websocket"

	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/message_receiver.go -package mock . MessageReceiver
type MessageReceiver interface {
	Receive(ClientReaderCloser) ([]byte, messages.MessageType, error)
}

type ClientReaderCloser interface {
	ReadJSON(any) ([]byte, error)
	Close() error
}

type messageReceiver struct {
}

func NewMessageReceiver() *messageReceiver {
	return &messageReceiver{}
}

func (r *messageReceiver) Receive(client ClientReaderCloser) ([]byte, messages.MessageType, error) {
	var envelope messages.Envelope

	buf, err := client.ReadJSON(&envelope)
	if err != nil {
		if t, ok := err.(timeouter); ok && t.Timeout() {
			// webapp stops sending PING messages if the tab is not focused, we're
			// going to silently disconnect the client if that happens, when the
			// client gets focused again it will reconnect.
			return nil, messages.EmptyMessageType, client.Close()
		}

		if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
			return nil, messages.EmptyMessageType, client.Close()
		}

		return nil, messages.EmptyMessageType, fmt.Errorf("read message: %w", err)
	}

	return buf, envelope.Type, nil
}

type timeouter interface {
	Timeout() bool
}
