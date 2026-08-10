package matchers

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type PVPMatchMatcher struct {
	logger             zerolog.Logger
	queryService       matchmaker.QueryService
	playerValidator    PlayerValidator
	botFactory         BotFactory
	playerCombinator   PlayerCombinator
	matchQualitySorter MatchQualitySorter

	findMatchWaitTimeWarn time.Duration
}

func NewPVPMatchMatcher(
	logger zerolog.Logger,
	queryService matchmaker.QueryService,
	playerValidator PlayerValidator,
	botFactory BotFactory,
	playerCombinator PlayerCombinator,
	matchQualitySorter MatchQualitySorter,
) *PVPMatchMatcher {
	return &PVPMatchMatcher{
		logger:                logger.With().Str("fn", "matchfunc.PVPMatchMatcher").Logger(),
		queryService:          queryService,
		playerValidator:       playerValidator,
		botFactory:            botFactory,
		playerCombinator:      playerCombinator,
		matchQualitySorter:    matchQualitySorter,
		findMatchWaitTimeWarn: time.Second * 60,
	}
}

func (h *PVPMatchMatcher) FindMatchProposals(ctx context.Context, request *matchmaker.FindMatchesRequest) ([]*matchmaker.MatchProposal, error) {
	queryRequest := &matchmaker.QueryRequest{
		GameModes: request.GameModes,
	}

	players, err := h.queryService.GetPlayers(ctx, queryRequest)
	if err != nil {
		return nil, fmt.Errorf("get players: %w", err)
	}

	validPlayers, err := h.validatePlayers(players)
	if err != nil {
		return nil, fmt.Errorf("validate players: %w", err)
	}

	if request.EnableBots {
		// Add a catch-all bot player, this player will be used to see if a player
		// meets the criteria to match against a bot on non-bot queues.
		validPlayers = append(validPlayers, h.botFactory.CreateSimple(request.GameModes[0]))
	}

	if len(validPlayers) < 2 {
		return nil, nil
	}

	combinations, err := h.playerCombinator.Combine(validPlayers)
	if err != nil {
		return nil, fmt.Errorf("combine players: %w", err)
	}

	matchProposals := h.processCombinations(combinations)

	return matchProposals, nil
}

func (h *PVPMatchMatcher) validatePlayers(players []*player.Player) ([]*player.Player, error) {
	var validPlayers []*player.Player

	for _, p := range players {
		isValid, err := h.playerValidator.IsValid(p)
		if err != nil {
			h.logger.Err(err).Stringer("address", p.Address()).Msg("player validation")
		}

		if !isValid {
			continue
		}

		validPlayers = append(validPlayers, p)
	}

	return validPlayers, nil
}

func (h *PVPMatchMatcher) processCombinations(combinations *PlayerCombinationMap) []*matchmaker.MatchProposal {
	var matchProposals []*matchmaker.MatchProposal

	for {
		// retrieve a list of players that might match with the user, this list
		// might change everytime we remove players, that's why we're looping until
		// no more combinations are possible
		matchedPlayers := combinations.Players()
		if len(matchedPlayers) < 1 {
			// no more candidates pending to match
			return matchProposals
		}

		p1 := matchedPlayers[0]

		candidates := combinations.Candidates(p1)

		// should not happen, but if happens we'll stop here
		if len(candidates) < 1 {
			return matchProposals
		}

		combinations.Remove(p1)

		h.matchQualitySorter.Sort(p1, candidates)

		var matchProposal *matchmaker.MatchProposal

		for i := 0; i < len(candidates); i++ {
			p2 := candidates[i]

			combinations.Remove(p2)

			if p2.IsBot() {
				b, err := h.botFactory.CreateRegistered(p1)
				if err != nil {
					// this failed for some reason, let it pass and continue with next player
					h.logger.Err(err).Msg("create registered bot")

					continue
				}

				p2 = b
			}

			matchProposal = matchmaker.NewMatchProposal(p1, p2)

			break
		}

		// TODO: This case is never going to happen because when PlayerCombinationMap has only 1 player it removes before it can be used.
		if matchProposal == nil {
			if p1.WaitTime() > h.findMatchWaitTimeWarn {
				h.logger.Warn().Msgf("player has been waiting for %s with no compatible candidates", p1.WaitTime())
			}

			continue
		}

		matchProposals = append(matchProposals, matchProposal)
	}
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_validator.go -package mock . PlayerValidator
type PlayerValidator interface {
	IsValid(player *player.Player) (bool, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_combinator.go -package mock . PlayerCombinator
type PlayerCombinator interface {
	Combine([]*player.Player) (*PlayerCombinationMap, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_quality_sorter.go -package mock . MatchQualitySorter
type MatchQualitySorter interface {
	Sort(*player.Player, []*player.Player)
}
