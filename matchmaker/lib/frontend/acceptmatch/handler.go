package acceptmatch

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
)

type Handler struct {
	matchAccepter MatchAccepter
}

func NewHandler(matchAccepter MatchAccepter) *Handler {
	return &Handler{
		matchAccepter: matchAccepter,
	}
}

func (h *Handler) Handle(ctx context.Context, client *frontend.Client) error {
	if !client.HasChannel() {
		return mmerrors.ErrMissingChannel
	}

	if !client.HasPlayer() {
		return mmerrors.ErrMissingPlayer
	}

	if err := h.matchAccepter.AcceptMatch(ctx, client.Player().Address()); err != nil {
		return fmt.Errorf("accept match: %w", err)
	}

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_accepter.go -package mock . MatchAccepter
type MatchAccepter interface {
	AcceptMatch(context.Context, proto.Hash) error
}
