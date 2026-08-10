package frontend

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/metrics"
)

type websocketHandler struct {
	logger                zerolog.Logger
	clientFactory         ClientFactory
	messageReceiver       MessageReceiver
	findMatchHandler      FindMatchMessageHandler
	acceptMatchHandler    ClientMessageHandler
	declineMatchHandler   ClientMessageHandler
	authenticationTimeout time.Duration
	messageSender         MessageSender

	mu      sync.Mutex
	clients map[*Client]bool
}

func NewWebsocketHandler(
	cfg *config.Config,
	logger zerolog.Logger,
	clientFactory ClientFactory,
	messageReceiver MessageReceiver,
	findMatchHandler FindMatchMessageHandler,
	acceptMatchHandler ClientMessageHandler,
	declineMatchHandler ClientMessageHandler,
	messageSender MessageSender,
) *websocketHandler {
	return &websocketHandler{
		authenticationTimeout: cfg.MatchMaker.AuthenticationTimeout,
		logger:                logger.With().Str("fn", "frontend.websocketHandler").Logger(),
		clientFactory:         clientFactory,
		messageReceiver:       messageReceiver,
		findMatchHandler:      findMatchHandler,
		acceptMatchHandler:    acceptMatchHandler,
		declineMatchHandler:   declineMatchHandler,
		messageSender:         messageSender,
		clients:               make(map[*Client]bool),
	}
}

func (h *websocketHandler) Run(ctx context.Context) error {
	<-ctx.Done()

	h.mu.Lock()

	var clients []*Client

	for client := range h.clients {
		clients = append(clients, client)
	}

	h.logger.Info().Msgf("shutting down with %d clients", len(clients))

	h.mu.Unlock()

	for _, client := range clients {
		select {
		case <-client.Done():
		default:
			if err := h.evictPlayer(client); err != nil {
				h.logger.Err(err).Msg("evict player")
			}
		}

		h.removeClient(client)
	}

	return nil
}

func (h *websocketHandler) Handle(ctx context.Context, wsConn *websocket.Conn, ipAddress string) error {
	startTime := time.Now()

	client := h.clientFactory.Create(wsConn, ipAddress)
	defer func() {
		client.Close()

		endTime := time.Now()
		sessionLength := endTime.Sub(startTime)

		client.Log().Info().
			Dur("session.length", sessionLength).
			Msgf("%s: client session ended after %v", client.ShortID(), sessionLength/time.Second*time.Second)

		metrics.RecordSessionDuration(startTime, endTime)
	}()

	clientsCount := h.addClient(client)
	defer h.removeClient(client)

	h.logger.Info().Msgf("%s: client session started (%d total)", client.ShortID(), clientsCount)
	metrics.RecordTotalClients(clientsCount)

	logger := client.Log()

	ticker := time.NewTicker(h.authenticationTimeout)

	for {
		select {
		case <-ticker.C:
			if !client.HasChannel() {
				ticker.Stop()
				logger.Info().Msg("client failed to authenticate during allowed window")

				return nil
			}
		case <-client.Done():
			logger.Info().Msg("client terminated")
			return nil
		case <-ctx.Done():
			logger.Info().Msg("context terminated")
			return nil
		default:
			if err := h.listenOnMessage(ctx, client); err != nil {
				logger.Err(err).Msg("listenOnMessage failed")
				var closeErr *websocket.CloseError

				if !errors.As(err, &closeErr) {
					if err := h.messageSender.SendErrorMessage(client, *mmerrors.ErrServerError); err != nil {
						h.logger.Err(err).Msg("send error message")
					}
				}

				client.Close()

				return nil
			}
		}
	}
}

func (h *websocketHandler) listenOnMessage(ctx context.Context, client *Client) error {
	// It is a blocking operation until some data are available or the connection is lost.
	buf, messageType, err := h.messageReceiver.Receive(client)
	if err != nil {
		return fmt.Errorf("receive message: %w", err)
	}

	if buf == nil && messageType == messages.EmptyMessageType {
		return nil
	}

	clientID := client.ShortID()

	logger := client.Log().With().
		Str("type", strings.ToUpper(string(messageType))).
		Str("clientID", clientID).
		Str("source", "client").
		Logger()

	switch messageType {
	case messages.PingType:
		logger.Debug().Msg("client ping")
	case messages.FindMatchType:
		var findMatchMessage *messages.FindMatchMessage

		err = json.Unmarshal(buf, &findMatchMessage)
		if err != nil {
			return fmt.Errorf("decode find match message: %w", err)
		}

		logger.Info().
			Stringer("playerID", findMatchMessage.PrivateSeed.Player).
			Str("versionHash", findMatchMessage.VersionHash).
			Array("matchCards", zerolog.Arr().Interface(findMatchMessage.PrivateSeed.Cards)).
			Array("matchPrisms", zerolog.Arr().Interface(findMatchMessage.PrivateSeed.Prisms)).
			Stringer("matchMode", findMatchMessage.Mode).
			Msgf("client is looking for a %s match", findMatchMessage.Mode)

		if err := h.findMatchHandler.Handle(ctx, client, findMatchMessage); err != nil {
			return fmt.Errorf("handle find match: %w", err)
		}
	case messages.AcceptMatchType:
		var acceptMatchMessage messages.AcceptMatchMessage

		err = json.Unmarshal(buf, &acceptMatchMessage)
		if err != nil {
			return fmt.Errorf("decode accept match message: %w", err)
		}

		logger.Info().
			Str("playerID", acceptMatchMessage.PlayerID).
			Msg("client accepted match")

		if err := h.acceptMatchHandler.Handle(ctx, client); err != nil {
			return fmt.Errorf("handle accept match: %w", err)
		}
	case messages.DeclineMatchType:
		var declineMatchMessage messages.DeclineMatchMessage

		err = json.Unmarshal(buf, &declineMatchMessage)
		if err != nil {
			return fmt.Errorf("decode decline match message: %w", err)
		}

		logger.Info().
			Str("playerID", declineMatchMessage.PlayerID).
			Msg("client declined match")

		if err := h.declineMatchHandler.Handle(ctx, client); err != nil {
			if errors.Is(err, mmerrors.ErrInvalidOperation) {
				if err := h.messageSender.SendErrorMessage(client, *mmerrors.ErrInvalidOperation); err != nil {
					return fmt.Errorf("send error message")
				}
			} else {
				return fmt.Errorf("handle decline match: %w", err)
			}
		}
	default:
		return fmt.Errorf("unexpected message: %s", messageType)
	}

	return nil
}

func (h *websocketHandler) addClient(client *Client) (count int) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[client] = true

	return len(h.clients)
}

func (h *websocketHandler) evictPlayer(client *Client) error {
	shutdownMessage := events.EventEvictedMessage{
		Error: mmerrors.ErrServerShutdown,
	}

	if err := h.messageSender.SendEvictedMessage(client, shutdownMessage); err != nil {
		return fmt.Errorf("send evicted message: %w", err)
	}

	return nil
}

func (h *websocketHandler) removeClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if err := client.Close(); err != nil {
		h.logger.Warn().Err(err).Msg("failed to close client connection")
	}

	delete(h.clients, client)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/client_message_handler.go -package mock . ClientMessageHandler
type ClientMessageHandler interface {
	Handle(context.Context, *Client) error
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/find_match_message_handler.go -package mock . FindMatchMessageHandler
type FindMatchMessageHandler interface {
	Handle(context.Context, *Client, *messages.FindMatchMessage) error
}
