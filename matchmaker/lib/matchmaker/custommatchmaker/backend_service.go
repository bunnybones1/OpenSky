package custommatchmaker

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gamemodechecker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type BackendService struct {
	logger                     zerolog.Logger
	matching                   matchmaker.Matching
	notifier                   Notifier
	playerQueue                PlayerQueue
	gameModeLocker             GameModeLocker
	gameModeStatusChecker      gamemodechecker.GameModeStatusChecker
	playerRepository           PlayerRepository
	matchProposalRepository    MatchProposalRepository
	acceptedMatchProposalQueue AcceptedMatchProposalQueue
	acceptTimeouter            AcceptTimeouter

	matchAcceptanceTimeout time.Duration
}

func NewBackendService(
	cfg *config.Config,
	logger zerolog.Logger,
	matching matchmaker.Matching,
	notifier Notifier,
	playerQueue PlayerQueue,
	gameModeLocker GameModeLocker,
	gameModeStatusChecker gamemodechecker.GameModeStatusChecker,
	playerRepository PlayerRepository,
	matchProposalRepository MatchProposalRepository,
	acceptedMatchProposalQueue AcceptedMatchProposalQueue,
	acceptTimeouter AcceptTimeouter,
) *BackendService {
	return &BackendService{
		logger:                     logger.With().Str("fn", "custommatchmaker.BackendService").Logger(),
		matching:                   matching,
		notifier:                   notifier,
		playerQueue:                playerQueue,
		gameModeLocker:             gameModeLocker,
		gameModeStatusChecker:      gameModeStatusChecker,
		playerRepository:           playerRepository,
		matchProposalRepository:    matchProposalRepository,
		acceptedMatchProposalQueue: acceptedMatchProposalQueue,
		acceptTimeouter:            acceptTimeouter,
		matchAcceptanceTimeout:     cfg.MatchMaker.MatchAcceptanceTimeout,
	}
}

func (s *BackendService) FindMatchProposals(ctx context.Context, request *matchmaker.FindMatchesRequest) ([]*matchmaker.MatchProposal, error) {
	switch request.MatchProposalStatus {
	case matchmaker.MatchProposalStatusFound:
		proposals, err := s.findFoundMatchProposals(ctx, request)
		if err != nil {
			return nil, fmt.Errorf("find found match proposals: %w", err)
		}

		return proposals, nil
	case matchmaker.MatchProposalStatusAccepted:
		proposals := s.findAcceptedMatchProposals(ctx, request)

		return proposals, nil
	}

	return nil, fmt.Errorf("unsupported request: %+v", request)
}

func (s *BackendService) findFoundMatchProposals(ctx context.Context, request *matchmaker.FindMatchesRequest) ([]*matchmaker.MatchProposal, error) {
	var enabledGameModes []proto.GameMode

	for _, gameMode := range request.GameModes {
		mu := s.gameModeLocker.Locker(gameMode)
		if err := mu.Lock(); err != nil {
			return nil, fmt.Errorf("lock: %w", err)
		}
		defer func() { _, _ = mu.Unlock() }()

		gameModeEnabled, err := s.gameModeStatusChecker.IsEnabled(ctx, gameMode)
		if err != nil {
			return nil, fmt.Errorf("check game mode status: %w", err)
		}

		if !gameModeEnabled {
			if err = s.drainPlayerQueue(ctx, gameMode); err != nil {
				s.logger.Err(err).Msg("drain the queue")
			}

			continue
		}

		enabledGameModes = append(enabledGameModes, gameMode)
	}

	if len(enabledGameModes) == 0 {
		return nil, nil
	}

	request.GameModes = enabledGameModes

	matchProposals, err := s.matching.FindMatchProposals(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("find match proposals: %w", err)
	}

	for _, matchProposal := range matchProposals {
		for _, p := range matchProposal.Players {
			if p.IsBot() {
				continue
			}

			if err := s.playerRepository.SetStatus(p, player.PlayerStatus_LOOKING_FOR_MATCH); err != nil {
				s.logger.Err(err).Msg("set player status to 'LOOKING_FOR_MATCH'")
			}

			if err := s.playerQueue.Remove(p); err != nil {
				s.logger.Err(err).Msg("remove player from queue")
			}
		}
	}

	return matchProposals, nil
}

func (s *BackendService) drainPlayerQueue(ctx context.Context, gameMode proto.GameMode) error {
	addresses, err := s.playerQueue.Items(gameMode)
	if err != nil {
		return fmt.Errorf("get players in queue: %w", err)
	}

	for _, address := range addresses {
		p := player.NewWithAddressAndMode(address, gameMode)

		if err := s.notifier.Message(ctx, errors.ErrGameModeDisabled, p); err != nil {
			s.logger.Err(err).Msg("send error game mode disabled message")
		}

		if err := s.playerQueue.Remove(p); err != nil {
			s.logger.Err(err).Msg("remove player from queue")
		}
	}

	return nil
}

func (s *BackendService) findAcceptedMatchProposals(ctx context.Context, request *matchmaker.FindMatchesRequest) []*matchmaker.MatchProposal {
	var proposals []*matchmaker.MatchProposal

	for _, gameMode := range request.GameModes {
		mu := s.gameModeLocker.Locker(gameMode)
		if err := mu.Lock(); err != nil {
			s.logger.Err(err).Msg("lock game mode")

			continue
		}
		defer func() { _, _ = mu.Unlock() }()

		gameModeEnabled, err := s.gameModeStatusChecker.IsEnabled(ctx, gameMode)
		if err != nil {
			s.logger.Err(err).Msg("check game mode status")

			continue
		}

		if !gameModeEnabled {
			if err := s.drainAcceptedMatchProposals(ctx, gameMode); err != nil {
				s.logger.Err(err).Msg("drain accepted match proposals")
			}

			continue
		}

		acceptedProposalIDs, err := s.acceptedMatchProposalQueue.Items(gameMode)
		if err != nil {
			s.logger.Err(err).Msg("list accepted match proposals")

			continue
		}

		for _, acceptedProposalID := range acceptedProposalIDs {
			mu := s.matchProposalRepository.Locker(acceptedProposalID)
			if err := mu.Lock(); err != nil {
				s.logger.Err(err).Msg("lock match proposal")

				continue
			}
			defer func() { _, _ = mu.Unlock() }()

			acceptedProposal, err := s.matchProposalRepository.Load(acceptedProposalID)
			if err != nil {
				s.logger.Err(err).Msg("load accepted match proposal")

				continue
			}

			if acceptedProposal == nil {
				continue
			}

			playersLoaded := true

			for _, address := range acceptedProposal.Addresses() {
				p, err := s.playerRepository.Load(address)
				if err != nil {
					s.logger.Err(err).Msg("load player in accepted match proposal")

					s.drainAcceptedMatchProposal(ctx, acceptedProposal, errors.ErrServerError)

					playersLoaded = false

					break
				}

				acceptedProposal.Players = append(acceptedProposal.Players, p)
			}

			if !playersLoaded {
				continue
			}

			acceptedProposal.SetToBeMade()

			if err := s.matchProposalRepository.Save(acceptedProposal); err != nil {
				s.logger.Err(err).Msg("save accepted match proposal")

				s.drainAcceptedMatchProposal(ctx, acceptedProposal, errors.ErrServerError)

				continue
			}

			proposals = append(proposals, acceptedProposal)
		}
	}

	return proposals
}

func (s *BackendService) drainAcceptedMatchProposals(ctx context.Context, gameMode proto.GameMode) error {
	proposalIDs, err := s.acceptedMatchProposalQueue.Items(gameMode)
	if err != nil {
		return fmt.Errorf("list accepted to drain: %w", err)
	}

	for _, proposalID := range proposalIDs {
		mu := s.matchProposalRepository.Locker(proposalID)
		if err := mu.Lock(); err != nil {
			s.logger.Err(err).Msg("lock match proposal to drain")

			continue
		}
		defer func() { _, _ = mu.Unlock() }()

		proposal, err := s.matchProposalRepository.Load(proposalID)
		if err != nil {
			s.logger.Err(err).Msg("load match proposal to drain")

			continue
		}

		if proposal == nil {
			continue
		}

		s.drainAcceptedMatchProposal(ctx, proposal, errors.ErrServerShutdown)
	}

	return nil
}

func (s *BackendService) drainAcceptedMatchProposal(ctx context.Context, proposal *matchmaker.MatchProposal, ev *events.Error) {
	for _, address := range proposal.Addresses() {
		if err := s.notifier.Message(ctx, ev, player.NewWithAddress(address)); err != nil {
			s.logger.Err(err).Msg("send error message")
		}
	}

	if err := s.matchProposalRepository.Delete(proposal); err != nil {
		s.logger.Err(err).Msg("delete accepted match proposal")
	}
}

func (s *BackendService) ReleasePlayer(_ context.Context, p *player.Player) error {
	if err := s.playerQueue.Push(p); err != nil {
		return fmt.Errorf("push player back to queue: %w", err)
	}

	if err := s.playerRepository.SetStatus(p, player.PlayerStatus_CONNECTED); err != nil {
		return fmt.Errorf("set player status to 'CONNECTED': %w", err)
	}

	return nil
}

func (s *BackendService) MatchFound(ctx context.Context, data matchmaker.MatchProcessedData) error {
	matchProposal := data.MatchProposal

	mu := s.matchProposalRepository.Locker(matchProposal.ID())
	if err := mu.Lock(); err != nil {
		return fmt.Errorf("lock match proposal: %w", err)
	}
	defer func() { _, _ = mu.Unlock() }()

	if err := s.matchProposalRepository.Save(matchProposal); err != nil {
		return fmt.Errorf("save match proposal: %w", err)
	}

	for _, p := range matchProposal.Players {
		if p.IsBot() {
			continue
		}

		opponent, err := matchProposal.Opponent(p)
		if err != nil {
			return fmt.Errorf("get opponent: %w", err)
		}

		p.SetMatchProposalID(matchProposal.ID())

		if err := s.playerRepository.Save(p); err != nil {
			return fmt.Errorf("save player: %w", err)
		}

		matchFoundMessage := events.EventFoundMessage{
			PlayerID:   p.Address(),
			OpponentID: opponent.Address(),
			TTL:        s.matchAcceptanceTimeout,
			Mode:       p.Mode,
		}

		if err := s.notifier.Message(ctx, matchFoundMessage, p); err != nil {
			return fmt.Errorf("send match found message: %w", err)
		}

		if err := s.playerRepository.SetStatus(p, player.PlayerStatus_MATCH_FOUND); err != nil {
			s.logger.Err(err).Msg("set player status to 'MATCH_FOUND'")
		}
	}

	s.acceptTimeouter.Schedule(matchProposal)

	return nil
}

func (s *BackendService) MatchMade(ctx context.Context, data matchmaker.MatchProcessedData) error {
	matchProposal := data.MatchProposal

	mu := s.matchProposalRepository.Locker(matchProposal.ID())
	if err := mu.Lock(); err != nil {
		return fmt.Errorf("lock match proposal: %w", err)
	}
	defer func() { _, _ = mu.Unlock() }()

	for _, p := range matchProposal.Players {
		if p.IsBot() {
			continue
		}

		matchMadeMessage := events.EventMadeMessage{
			ServerAddress: data.GameServerInfo.WebSocketURL(),
			Mode:          p.Mode,
		}

		if err := s.notifier.Message(ctx, matchMadeMessage, p); err != nil {
			return fmt.Errorf("send match made message: %w", err)
		}

		if err := s.playerRepository.SetStatus(p, player.PlayerStatus_MATCH_DISPATCHED); err != nil {
			s.logger.Err(err).Msg("set player status to 'MATCH_DISPATCHED'")
		}
	}

	if err := s.matchProposalRepository.Delete(matchProposal); err != nil {
		s.logger.Err(err).Msg("delete match proposal when match has been made")
	}

	return nil
}
