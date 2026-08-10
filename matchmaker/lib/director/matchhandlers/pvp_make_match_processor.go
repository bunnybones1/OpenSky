package matchhandlers

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/metrics"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerstats"
)

type PVPMakeMatchProcessor struct {
	logger                   zerolog.Logger
	matchmakerBackendService matchmaker.BackendService
	gameServerManager        gameservers.Manager
	openskyAPI               SkyWeaverAPI
	refusalPenaltyDeleter    RefusalPenaltyDeleter
	playerStatsPusher        PlayerStatsPusher
	recentMatchTracker       RecentMatchTracker
	playerShuffler           PlayerShuffler

	playersCount int
}

func NewPVPMakeMatchProcessor(
	logger zerolog.Logger,
	matchmakerBackendService matchmaker.BackendService,
	gameServerManager gameservers.Manager,
	openskyAPI SkyWeaverAPI,
	refusalPenaltyDeleter RefusalPenaltyDeleter,
	playerStatsPusher PlayerStatsPusher,
	recentMatchTracker RecentMatchTracker,
	playerShuffler PlayerShuffler,
) *PVPMakeMatchProcessor {
	return &PVPMakeMatchProcessor{
		logger:                   logger.With().Str("fn", "matchhandlers.PVPMakeMatchProcessor").Logger(),
		matchmakerBackendService: matchmakerBackendService,
		gameServerManager:        gameServerManager,
		openskyAPI:               openskyAPI,
		refusalPenaltyDeleter:    refusalPenaltyDeleter,
		playerStatsPusher:        playerStatsPusher,
		recentMatchTracker:       recentMatchTracker,
		playerShuffler:           playerShuffler,
		playersCount:             2,
	}
}

func (h *PVPMakeMatchProcessor) ProcessMatch(ctx context.Context, matchProposal *matchmaker.MatchProposal) error {
	if matchProposal.PlayersCount() != h.playersCount {
		return fmt.Errorf("expected %d players, got %d instead", h.playersCount, matchProposal.PlayersCount())
	}

	players := h.playerShuffler.Shuffle(matchProposal.Players)

	for _, p := range players {
		if err := h.refusalPenaltyDeleter.DeleteRefusalPenalty(p); err != nil {
			return fmt.Errorf("delete refusal penalty: %w", err)
		}
	}

	err := h.playerStatsPusher.Push(players[0].Address(), &playerstats.Stat{
		Hero:         prismsToHero(players[0].PrivateSeed.Prisms),
		OpponentHero: prismsToHero(players[1].PrivateSeed.Prisms),
		OpponentID:   players[1].Address(),
	})
	if err != nil {
		h.logger.Err(err).Msg("push player stats")
	}

	err = h.playerStatsPusher.Push(players[1].Address(), &playerstats.Stat{
		Hero:         prismsToHero(players[1].PrivateSeed.Prisms),
		OpponentHero: prismsToHero(players[0].PrivateSeed.Prisms),
		OpponentID:   players[0].Address(),
	})
	if err != nil {
		h.logger.Err(err).Msg("push player stats")
	}

	if err := h.recentMatchTracker.DeleteMatch(players[0].Address(), players[1].Address()); err != nil {
		return fmt.Errorf("delete recent match: %w", err)
	}

	p := players[0]

	gameServerInfo, err := h.gameServerManager.Find(ctx, p.ClientVersionHash)
	if err != nil {
		return fmt.Errorf("find game server: %w", err)
	}

	season, err := h.openskyAPI.GetCurrentSeason(ctx)
	if err != nil {
		return fmt.Errorf("get current season: %w", err)
	}

	matchID, replayID, err := h.openskyAPI.MatchStart(ctx, players[0], players[1])
	if err != nil {
		return fmt.Errorf("start match: %w", err)
	}

	matchRequest := gameservers.MatchRequest{
		MatchID:  matchID,
		ReplayID: replayID,
		Players:  players,
		Season:   season,
	}

	if err := h.gameServerManager.InitiateMatch(ctx, gameServerInfo, matchRequest); err != nil {
		return fmt.Errorf("initiate match: %w", err)
	}

	matchProcessedData := matchmaker.MatchProcessedData{
		MatchProposal:  matchProposal,
		GameServerInfo: gameServerInfo,
	}

	if err := h.matchmakerBackendService.MatchMade(ctx, matchProcessedData); err != nil {
		return fmt.Errorf("send match made: %w", err)
	}

	if players[0].Mode == players[1].Mode {
		metrics.RecordCommand("match_made", players[0].Mode)
	} else {
		metrics.RecordCommand("match_made", players[0].Mode)
		metrics.RecordCommand("match_made", players[1].Mode)
	}

	metrics.RecordTotalWaitTime(players[0].Mode, *players[0].InitTimestamp, time.Now())
	metrics.RecordTotalWaitTime(players[1].Mode, *players[1].InitTimestamp, time.Now())

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/refusal_penalty_deleter.go -package mock . RefusalPenaltyDeleter
type RefusalPenaltyDeleter interface {
	DeleteRefusalPenalty(*player.Player) error
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_stats_pusher.go -package mock . PlayerStatsPusher
type PlayerStatsPusher interface {
	Push(proto.Hash, *playerstats.Stat) error
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/recent_match_tracker.go -package mock . RecentMatchTracker
type RecentMatchTracker interface {
	DeleteMatch(addresses ...proto.Hash) error
}
