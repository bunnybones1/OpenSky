package frontend

import (
	"fmt"
	"time"

	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/message_sender.go -package mock . MessageSender
type MessageSender interface {
	SendRefusalCooldownMessage(ClientWriter, time.Duration) error
	SendMatchFoundMessage(ClientWriter, events.EventFoundMessage) error
	SendAcceptedMatchMessage(ClientWriter, events.EventAcceptedMessage) error
	SendMatchedMessage(ClientWriter, events.EventMadeMessage) error
	SendDeclinedMatchMessage(ClientWriter, events.EventDeclinedMessage) error
	SendEvictedMessage(ClientWriter, events.EventEvictedMessage) error
	SendTimeoutMessage(ClientWriter) error
	SendErrorMessage(ClientWriter, events.Error) error
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/client_writer.go -package mock . ClientWriter
type ClientWriter interface {
	WriteJSON(any) error
}

type messageSender struct {
}

func NewMessageSender() *messageSender {
	return &messageSender{}
}

func (s *messageSender) SendRefusalCooldownMessage(client ClientWriter, penalty time.Duration) error {
	msg := messages.NewCooldownPenaltyMessage(penalty)

	if err := client.WriteJSON(msg); err != nil {
		return fmt.Errorf("write json to client: %w", err)
	}

	return nil
}

func (s *messageSender) SendMatchFoundMessage(client ClientWriter, ev events.EventFoundMessage) error {
	msg := messages.NewMatchFoundMessage(
		ev.Mode,
		ev.TTL,
		[]string{ev.PlayerID.String(), ev.OpponentID.String()},
	)

	if err := client.WriteJSON(msg); err != nil {
		return fmt.Errorf("write json to client: %w", err)
	}

	return nil
}

func (s *messageSender) SendAcceptedMatchMessage(client ClientWriter, ev events.EventAcceptedMessage) error {
	msg := messages.NewAcceptedMatchMessage(ev.PlayerID)

	if err := client.WriteJSON(msg); err != nil {
		return fmt.Errorf("write json to client: %w", err)
	}

	return nil
}

func (s *messageSender) SendMatchedMessage(client ClientWriter, ev events.EventMadeMessage) error {
	matchMadeMsg := messages.NewMatchMadeMessage(ev.ServerAddress)

	if err := client.WriteJSON(matchMadeMsg); err != nil {
		return fmt.Errorf("write json with match made message to client: %w", err)
	}

	matchReadyMsg := messages.NewMatchReadyToStartMessage(ev.Mode)

	if err := client.WriteJSON(matchReadyMsg); err != nil {
		return fmt.Errorf("write json with match ready message to client: %w", err)
	}

	return nil
}

func (s *messageSender) SendDeclinedMatchMessage(client ClientWriter, ev events.EventDeclinedMessage) error {
	msg := messages.NewDeclinedMatchMessage(ev.PlayerID)

	if err := client.WriteJSON(msg); err != nil {
		return fmt.Errorf("write json to client: %w", err)
	}

	return nil
}

func (s *messageSender) SendEvictedMessage(client ClientWriter, ev events.EventEvictedMessage) error {
	switch ev.Error {
	case mmerrors.ErrDuplicateConnection,
		mmerrors.ErrServerShutdown:
		return s.SendErrorMessage(client, *ev.Error)
	}

	return fmt.Errorf("unexpected error")
}

func (s *messageSender) SendTimeoutMessage(client ClientWriter) error {
	msg := messages.NewTimedOutMessage()

	if err := client.WriteJSON(msg); err != nil {
		return fmt.Errorf("write json to client: %w", err)
	}

	return nil
}

func (s *messageSender) SendErrorMessage(client ClientWriter, ev events.Error) error {
	msg := messages.NewErrorMessage(ev.Reason)

	if err := client.WriteJSON(msg); err != nil {
		return fmt.Errorf("write json to client: %w", err)
	}

	return nil
}
