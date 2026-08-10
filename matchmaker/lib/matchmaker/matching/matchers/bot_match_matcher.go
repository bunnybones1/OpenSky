package matchers

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/metrics"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type BotMatchMatcher struct {
	logger       zerolog.Logger
	queryService matchmaker.QueryService
	botFactory   BotFactory
}

func NewBotMatchMatcher(logger zerolog.Logger, queryService matchmaker.QueryService, botFactory BotFactory) *BotMatchMatcher {
	return &BotMatchMatcher{
		logger:       logger.With().Str("fn", "matchfunc.BotMatchMatcher").Logger(),
		queryService: queryService,
		botFactory:   botFactory,
	}
}

func (h *BotMatchMatcher) FindMatchProposals(ctx context.Context, request *matchmaker.FindMatchesRequest) ([]*matchmaker.MatchProposal, error) {
	queryRequest := &matchmaker.QueryRequest{
		GameModes: request.GameModes,
	}

	players, err := h.queryService.GetPlayers(ctx, queryRequest)
	if err != nil {
		return nil, fmt.Errorf("get players: %w", err)
	}

	if len(players) == 0 {
		return nil, nil
	}

	var matchProposals []*matchmaker.MatchProposal

	for _, p := range players {
		b, err := h.botFactory.CreateUnregistered(p)
		if err != nil {
			return nil, fmt.Errorf("create unregistered bot: %w", err)
		}

		matchProposals = append(matchProposals, matchmaker.NewMatchProposal(p, b))

		metrics.RecordQueueWaitTime(p.Mode, *p.InitTimestamp, time.Now())
	}

	return matchProposals, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/bot_factory.go -package mock . BotFactory
type BotFactory interface {
	CreateUnregistered(*player.Player) (*player.Player, error)
	CreateRegistered(*player.Player) (*player.Player, error)
	CreateSimple(proto.GameMode) *player.Player
}
