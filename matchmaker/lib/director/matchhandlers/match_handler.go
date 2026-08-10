package matchhandlers

import (
	"context"
	"sync"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
)

// MatchHandler calls matchmaker.BackendService for set of matchmaker.MatchProposal based on parameters
// and delegates processing to MatchProcessor.
type MatchHandler struct {
	logger                   zerolog.Logger
	matchmakerBackendService matchmaker.BackendService
	matchProcessor           MatchProcessor
	findMatchParams          []FindMatchesParams
}

func NewMatchHandler(
	logger zerolog.Logger,
	matchmakerBackendService matchmaker.BackendService,
	matchProcessor MatchProcessor,
	findMatchParams ...FindMatchesParams,
) *MatchHandler {
	return &MatchHandler{
		logger:                   logger.With().Str("fn", "matchhandlers.MatchHandler").Logger(),
		matchmakerBackendService: matchmakerBackendService,
		matchProcessor:           matchProcessor,
		findMatchParams:          findMatchParams,
	}
}

func (h *MatchHandler) HandleMatches(ctx context.Context) error {
	wg := sync.WaitGroup{}

	for _, params := range h.findMatchParams {
		wg.Add(1)

		go func(findMatchParams FindMatchesParams) {
			defer wg.Done()

			request := &matchmaker.FindMatchesRequest{
				GameModes:           findMatchParams.GameModes,
				MatchProposalStatus: findMatchParams.MatchProposalStatus,
				EnableBots:          findMatchParams.EnableBots,
			}

			matches, err := h.matchmakerBackendService.FindMatchProposals(ctx, request)
			if err != nil {
				h.logger.Err(err).Msgf("find matches for %v", h.findMatchParams)
				return
			}

			for _, match := range matches {
				if err := h.matchProcessor.ProcessMatch(ctx, match); err != nil {
					h.logger.Err(err).Msg("process match")

					for _, p := range match.Players {
						if err := h.matchmakerBackendService.ReleasePlayer(ctx, p); err != nil {
							h.logger.Err(err).Msgf("release player %q", p.Address())
						}
					}
				}
			}
		}(params)
	}

	wg.Wait()

	return nil
}

type FindMatchesParams struct {
	// When more modes are provided the results are processed together.
	// In case of PvP it means players from multiple queues are mixed together.
	GameModes           []proto.GameMode
	MatchProposalStatus matchmaker.MatchProposalStatus
	EnableBots          bool
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_processor.go -package mock . MatchProcessor
type MatchProcessor interface {
	ProcessMatch(context.Context, *matchmaker.MatchProposal) error
}
