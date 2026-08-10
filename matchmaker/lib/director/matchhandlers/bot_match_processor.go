package matchhandlers

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/metrics"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type BotMatchProcessor struct {
	matchmakerBackendService matchmaker.BackendService
	gameServerManager        gameservers.Manager
	openskyAPI               SkyWeaverAPI
	playerShuffler           PlayerShuffler

	playersCount int
}

func NewBotMatchProcessor(
	matchmakerBackendService matchmaker.BackendService,
	gameServerManager gameservers.Manager,
	openskyAPI SkyWeaverAPI,
	playerShuffler PlayerShuffler,
) *BotMatchProcessor {
	return &BotMatchProcessor{
		matchmakerBackendService: matchmakerBackendService,
		gameServerManager:        gameServerManager,
		openskyAPI:               openskyAPI,
		playerShuffler:           playerShuffler,
		playersCount:             2,
	}
}

func (h *BotMatchProcessor) ProcessMatch(ctx context.Context, matchProposal *matchmaker.MatchProposal) error {
	if matchProposal.PlayersCount() != h.playersCount {
		return fmt.Errorf("expected %d players, got %d instead", h.playersCount, matchProposal.PlayersCount())
	}

	realPlayer, err := h.findRealPlayer(matchProposal.Players)
	if err != nil {
		return fmt.Errorf("find real player: %w", err)
	}

	players := h.playerShuffler.Shuffle(matchProposal.Players)

	gameServerInfo, err := h.gameServerManager.Find(ctx, realPlayer.ClientVersionHash)
	if err != nil {
		return fmt.Errorf("find game server: %w", err)
	}

	season, err := h.openskyAPI.GetCurrentSeason(ctx)
	if err != nil {
		return fmt.Errorf("get current season: %w", err)
	}

	// bots get a fake matchID and replayID
	matchID := uint64(999999999999999) + uint64(rand.Int63n(10000000))

	matchRequest := gameservers.MatchRequest{
		MatchID:  matchID,
		ReplayID: "",
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
		return fmt.Errorf("send match processed: %w", err)
	}

	metrics.RecordCommand("match_made", realPlayer.Mode)
	metrics.RecordTotalWaitTime(realPlayer.Mode, *realPlayer.InitTimestamp, time.Now())

	return nil
}

func (h *BotMatchProcessor) findRealPlayer(players []*player.Player) (*player.Player, error) {
	for _, p := range players {
		if !p.IsBot() {
			return p, nil
		}
	}

	return nil, fmt.Errorf("no real player found")
}
