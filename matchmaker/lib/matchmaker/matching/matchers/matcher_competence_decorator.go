package matchers

import (
	"context"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching"
)

// MatcherCompetenceDecorator is a wrapper for matching.Matcher and checks whether
// the matcher is competent to handle incoming *matchmaker.FindMatchesRequest and
// passes the request if it is.
type MatcherCompetenceDecorator struct {
	matcher          matching.Matcher
	allowedGameModes map[proto.GameMode]bool
}

func NewMatcherCompetenceDecorator(matcher matching.Matcher, findMatchesConditions FindMatchesConditions) *MatcherCompetenceDecorator {
	gameModes := make(map[proto.GameMode]bool)

	for _, gameMode := range findMatchesConditions.GameModes {
		gameModes[gameMode] = true
	}

	return &MatcherCompetenceDecorator{
		matcher:          matcher,
		allowedGameModes: gameModes,
	}
}

func (h *MatcherCompetenceDecorator) FindMatchProposals(ctx context.Context, request *matchmaker.FindMatchesRequest) ([]*matchmaker.MatchProposal, error) {
	if !h.isCompetent(request) {
		return nil, matching.ErrIncompetentHandler
	}

	return h.matcher.FindMatchProposals(ctx, request)
}

func (h *MatcherCompetenceDecorator) isCompetent(request *matchmaker.FindMatchesRequest) bool {
	for _, gameMode := range request.GameModes {
		if !h.allowedGameModes[gameMode] {
			return false
		}
	}

	return true
}

type FindMatchesConditions struct {
	GameModes []proto.GameMode
}
