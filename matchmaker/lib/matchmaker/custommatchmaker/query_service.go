package custommatchmaker

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/metrics"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type QueryService struct {
	logger           zerolog.Logger
	playerQueue      PlayerQueue
	playerRepository PlayerRepository
	notifier         Notifier
}

func NewQueryService(
	logger zerolog.Logger,
	playerQueue PlayerQueue,
	playerRepository PlayerRepository,
	notifier Notifier,
) *QueryService {
	return &QueryService{
		logger:           logger.With().Str("fn", "custommatchmaker.QueryService").Logger(),
		playerQueue:      playerQueue,
		playerRepository: playerRepository,
		notifier:         notifier,
	}
}

func (s *QueryService) GetPlayers(_ context.Context, request *matchmaker.QueryRequest) ([]*player.Player, error) {
	var players []*player.Player

	for _, gameMode := range request.GameModes {
		playersForGameMode, err := s.getPlayersForGameMode(gameMode)
		if err != nil {
			return nil, fmt.Errorf("get players for game mode: %w", err)
		}

		players = append(players, playersForGameMode...)
	}

	return players, nil
}

func (s *QueryService) getPlayersForGameMode(gameMode proto.GameMode) ([]*player.Player, error) {
	var players []*player.Player

	addresses, err := s.playerQueue.Items(gameMode)
	if err != nil {
		return nil, fmt.Errorf("get items from queue: %w", err)
	}

	for _, address := range addresses {
		p, err := s.playerRepository.Load(address)
		if err != nil {
			s.logger.Err(err).Msg("retrieve player data from store")

			p = player.NewWithAddressAndMode(address, gameMode) // player has no data
			if err := s.playerQueue.Remove(p); err != nil {
				s.logger.Err(err).Msg("remove player with no data from queue")
			}

			continue
		}

		nsubs, err := s.notifier.NumberOfSubscribers(p)
		if err != nil {
			return nil, fmt.Errorf("get number of subscribers: %w", err)
		}

		if nsubs == 0 {
			// this means the player has no active subscriptions for some reason,
			// this is not expected and means there's an inconsistency between a
			// queue and its subscriptions.
			s.logger.Warn().Msg("found orphaned player in queue")

			if err := s.playerQueue.Remove(p); err != nil {
				s.logger.Err(err).Msg("remove orphaned player from queue")
			}

			continue
		}

		players = append(players, p)
	}

	metrics.RecordQueueSize(gameMode.String(), len(players))

	return players, nil
}
