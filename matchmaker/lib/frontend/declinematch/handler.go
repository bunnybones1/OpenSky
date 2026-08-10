package declinematch

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
)

type Handler struct {
	matchDecliner MatchDecliner
}

func NewHandler(matchDecliner MatchDecliner) *Handler {
	return &Handler{
		matchDecliner: matchDecliner,
	}
}

func (h *Handler) Handle(ctx context.Context, client *frontend.Client) error {
	if !client.HasChannel() {
		return mmerrors.ErrMissingChannel
	}

	if !client.HasPlayer() {
		return mmerrors.ErrMissingPlayer
	}

	if err := h.matchDecliner.DeclineMatch(ctx, client.Player().Address()); err != nil {
		return fmt.Errorf("decline match: %w", err)
	}

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_decliner.go -package mock . MatchDecliner
type MatchDecliner interface {
	DeclineMatch(context.Context, proto.Hash) error
}
