package findmatch

import (
	"context"
	"fmt"
	"sync"

	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/metrics"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
)

type Handler struct {
	playerFactory PlayerFactory
	notifier      Notifier
	matchFinder   MatchFinder
	eventListener EventListener
	validators    []Validator

	mu sync.Mutex
}

func NewHandler(
	playerFactory PlayerFactory,
	notifier Notifier,
	matchFinder MatchFinder,
	eventListener EventListener,
	validators ...Validator,
) *Handler {
	return &Handler{
		playerFactory: playerFactory,
		notifier:      notifier,
		matchFinder:   matchFinder,
		eventListener: eventListener,
		validators:    validators,
	}
}

func (h *Handler) Handle(ctx context.Context, client *frontend.Client, msg *messages.FindMatchMessage) error {
	if client.HasChannel() {
		return nil
	}

	p, err := h.playerFactory.Create(ctx, msg)
	if err != nil {
		return fmt.Errorf("create player: %w", err)
	}

	client.SetPlayer(p)

	for i := 0; i < len(h.validators); i++ {
		validator := h.validators[i]

		isValid, err := validator.IsValid(ctx, client, msg)
		if err != nil {
			return fmt.Errorf("validator #%d: %w", i, err)
		}

		if !isValid {
			return nil
		}
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	// Send a mmerrors.ErrDuplicateConnection message to any other subscribers (maybe from
	// other devices), we only want one subscriber at a time.
	if err := h.notifier.Message(ctx, mmerrors.ErrDuplicateConnection, p); err != nil {
		client.Log().Err(err).Msgf("failed to send message")
	}

	channel, err := h.matchFinder.FindMatch(ctx, p)
	if err != nil {
		return fmt.Errorf("find match: %w", err)
	}

	client.SetChannel(channel)

	go h.eventListener.Listen(ctx, client)

	metrics.RecordCommand("find_match", p.Mode)

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/notifier.go -package mock . Notifier
type Notifier interface {
	Message(context.Context, events.Event, ...*player.Player) error
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_finder.go -package mock . MatchFinder
type MatchFinder interface {
	FindMatch(context.Context, *player.Player) (*playerchannel.PlayerChannel, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/validator.go -package mock . Validator
type Validator interface {
	IsValid(context.Context, *frontend.Client, *messages.FindMatchMessage) (bool, error)
}
