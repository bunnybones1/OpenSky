package findmatch

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/event_listener.go -package mock . EventListener
type EventListener interface {
	Listen(context.Context, *frontend.Client)
}

type eventListener struct {
	messageSender frontend.MessageSender

	ctx context.Context
}

func NewEventListener(messageSender frontend.MessageSender) *eventListener {
	return &eventListener{
		messageSender: messageSender,
	}
}

func (l *eventListener) Run(ctx context.Context) error {
	l.ctx = ctx

	return nil
}

func (l *eventListener) Listen(ctx context.Context, client *frontend.Client) {
	address := client.Player().Address()
	channel := client.Channel()

	logger := client.Log().With().
		Stringer("address", address).
		Logger()

	var status error
	defer func() {
		channel.Close()

		if status != nil {
			logger.Err(status).Msg("event listener ran into an unexpected error")

			// This usually fails because the client connection is already lost.
			_ = l.messageSender.SendErrorMessage(client, *mmerrors.ErrServerError)

			client.Close()
		}
	}()

	for {
		select {
		case <-l.ctx.Done():
			// application shutdown
			return
		case <-ctx.Done():
			return
		case <-client.Done():
			return
		case <-channel.Done():
			return
		default:
			if err := l.listenOnEvent(logger, client); err != nil {
				status = fmt.Errorf("listen on event: %w", err)

				return
			}
		}
	}
}

func (l *eventListener) listenOnEvent(logger zerolog.Logger, client *frontend.Client) error {
	address := client.Player().Address()
	shortPlayerID := fmt.Sprintf("%s:%s", client.ShortID(), address[0:8])
	channel := client.Channel()

	// It is a blocking operation until some data are available or the channel is closed.
	event, ok := <-channel.ReadMessage()
	if !ok {
		return nil
	}

	logger = logger.With().
		Interface("event", event).
		Stringer("type", event.Type()).
		Logger()

	switch event.Type() {
	case events.TypeFound:
		found := event.(events.EventFoundMessage)
		if err := l.messageSender.SendMatchFoundMessage(client, found); err != nil {
			return fmt.Errorf("send match found message: %w", err)
		}

		logger.Info().
			Stringer("opponentID", found.OpponentID).
			Msgf("%s: match found", shortPlayerID)

	case events.TypeAccepted:
		accepted := event.(events.EventAcceptedMessage)
		if err := l.messageSender.SendAcceptedMatchMessage(client, accepted); err != nil {
			return fmt.Errorf("send accept match event: %w", err)
		}

		if address == accepted.PlayerID {
			logger.Info().
				Msgf("%s: player accepted match", shortPlayerID)
		} else {
			logger.Info().
				Stringer("opponentID", accepted.PlayerID).
				Msgf("%s: opponent accepted match", shortPlayerID)
		}

	case events.TypeDeclined:
		declined := event.(events.EventDeclinedMessage)
		if err := l.messageSender.SendDeclinedMatchMessage(client, declined); err != nil {
			return fmt.Errorf("send declined match message: %w", err)
		}

		if address == declined.PlayerID {
			logger.Info().
				Msgf("%s: player declined match", shortPlayerID)
		} else {
			logger.Info().
				Stringer("opponentID", declined.PlayerID).
				Msgf("%s: opponent declined match", shortPlayerID)
		}

	case events.TypeMade:
		matched := event.(events.EventMadeMessage)
		if err := l.messageSender.SendMatchedMessage(client, matched); err != nil {
			return fmt.Errorf("send matched message: %w", err)
		}

		logger.Info().
			Msgf("%s: match completed", shortPlayerID)

	case events.TypeTimedOut:
		if err := l.messageSender.SendTimeoutMessage(client); err != nil {
			return fmt.Errorf("send timout message: %w", err)
		}

		logger.Info().
			Msgf("%s: match timed out", shortPlayerID)

	case events.TypeEvicted:
		evicted := event.(events.EventEvictedMessage)
		if err := l.messageSender.SendEvictedMessage(client, evicted); err != nil {
			return fmt.Errorf("send evicted message: %w", err)
		}

		logger.Info().
			Msgf("%s: player evicted", shortPlayerID)

	case events.TypeError:
		notice := event.(*events.Error)
		if err := l.messageSender.SendErrorMessage(client, *notice); err != nil {
			return fmt.Errorf("send error message: %w", err)
		}

		logger.Info().
			Msgf("%s: player got error: %v", shortPlayerID, notice)

	default:
		logger.Error().Msg("received unknown event from pubsub service")
	}

	return nil
}
