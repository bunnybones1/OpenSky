package custommatchmaker

import (
	"fmt"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue"
)

type StatusService struct {
	matchMakerConfig  config.MatchMakerConfig
	logger            zerolog.Logger
	gameServerManager GameServerManager
	playerQueue       PlayerQueue
	playerRepository  PlayerRepository
	gameModeLocker    GameModeLocker
	versionHash       string
}

func NewStatusService(
	cfg *config.Config,
	logger zerolog.Logger,
	gameServerManager GameServerManager,
	playerQueue PlayerQueue,
	playerRepository PlayerRepository,
	gameModeLocker GameModeLocker,
) *StatusService {
	return &StatusService{
		matchMakerConfig:  cfg.MatchMaker,
		logger:            logger.With().Str("fn", "custommatchmaker.StatusService").Logger(),
		gameServerManager: gameServerManager,
		playerQueue:       playerQueue,
		playerRepository:  playerRepository,
		gameModeLocker:    gameModeLocker,
		versionHash:       cfg.VersionHash,
	}
}

func (s *StatusService) Status() (*matchmaker.Status, error) {
	serverInfo, err := s.gameServerManager.ListInfo()
	if err != nil {
		s.logger.Err(err).Msg("list game servers info")
	}

	var queueStatuses []*matchmaker.QueueStatus

	for gameModeID := range proto.GameMode_name {
		gameMode := proto.GameMode(gameModeID)

		if gameMode == proto.GameMode_UNKNOWN {
			continue
		}

		queueInfo, err := s.queueStatus(gameMode)
		if err != nil {
			s.logger.Err(err).Msg("get queue status")

			continue
		}

		queueStatuses = append(queueStatuses, queueInfo)
	}

	return &matchmaker.Status{
		Queues:         queueStatuses,
		Config:         s.matchMakerConfig,
		ServerInfo:     serverInfo,
		ReleaseVersion: s.versionHash,
	}, nil
}

func (s *StatusService) queueStatus(gameMode proto.GameMode) (*matchmaker.QueueStatus, error) {
	mu := s.gameModeLocker.Locker(gameMode)
	if err := mu.Lock(); err != nil {
		return nil, fmt.Errorf("lock: %w", err)
	}
	defer func() { _, _ = mu.Unlock() }()

	addresses, err := s.playerQueue.Items(gameMode)
	if err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}

	players := make([]matchmaker.PlayerStatus, 0, len(addresses))

	for _, address := range addresses {
		var playerStatus matchmaker.PlayerStatus

		p, err := s.playerRepository.Load(address)
		if err != nil {
			continue
		}

		playerStatus.Address = p.Address().String()
		playerStatus.GameMode = p.Mode.String()
		playerStatus.WaitTimeMS = uint(p.WaitTime() / time.Millisecond)
		playerStatus.Rank = uint32(p.Rank())
		playerStatus.ConquestInfo = p.ConquestInfo
		if p.Account != nil {
			playerStatus.Username = p.Account.Name
			if p.Account.Stats != nil && p.Account.Stats.RankedConstructed != nil && p.Account.Stats.RankedConstructed.Score != nil {
				playerStatus.ELO.ConstructedScore = *p.Account.Stats.RankedConstructed.Score
			}
			if p.Account.Stats != nil && p.Account.Stats.RankedDiscovery != nil && p.Account.Stats.RankedDiscovery.Score != nil {
				playerStatus.ELO.DiscoveryScore = *p.Account.Stats.RankedDiscovery.Score
			}
		}

		players = append(players, playerStatus)
	}

	return &matchmaker.QueueStatus{
		Name:    queue.NewGameModeQueue(gameMode).Name(),
		Players: players,
		Size:    len(players),
	}, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/game_server_manager.go -package mock . GameServerManager
type GameServerManager interface {
	ListInfo() (map[string]*gameservers.GameServerInfo, error)
}
