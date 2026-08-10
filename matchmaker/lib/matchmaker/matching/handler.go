package matching

import (
	"context"
	"errors"
	"fmt"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
)

type Handler struct {
	matchers []Matcher
}

func NewHandler(matchers ...Matcher) *Handler {
	return &Handler{
		matchers: matchers,
	}
}

func (h *Handler) FindMatchProposals(ctx context.Context, request *matchmaker.FindMatchesRequest) ([]*matchmaker.MatchProposal, error) {
	for i := 0; i < len(h.matchers); i++ {
		matcher := h.matchers[i]

		matches, err := matcher.FindMatchProposals(ctx, request)
		if err != nil {
			if errors.Is(err, ErrIncompetentHandler) {
				continue
			}

			return nil, fmt.Errorf("find match proposals (%d): %w", i, err)
		}

		return matches, nil
	}

	return nil, fmt.Errorf("no matcher found")
}

var ErrIncompetentHandler = fmt.Errorf("incompetent match function")

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/matcher.go -package mock . Matcher
type Matcher interface {
	FindMatchProposals(context.Context, *matchmaker.FindMatchesRequest) ([]*matchmaker.MatchProposal, error)
}
