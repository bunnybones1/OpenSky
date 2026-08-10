package custommatchmaker

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/metrics"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
)

type FrontendService struct {
	logger                  zerolog.Logger
	playerQueue             PlayerQueue
	playerRepository        PlayerRepository
	matchProposalRepository MatchProposalRepository
	channelFactory          ChannelFactory
	notifier                Notifier
	accepter                Accepter
	decliner                Decliner
}

func NewFrontendService(
	logger zerolog.Logger,
	playerQueue PlayerQueue,
	playerRepository PlayerRepository,
	matchProposalRepository MatchProposalRepository,
	channelFactory ChannelFactory,
	notifier Notifier,
	accepter Accepter,
	decliner Decliner,
) *FrontendService {
	return &FrontendService{
		logger:                  logger.With().Str("fn", "custommatchmaker.FrontendService").Logger(),
		playerQueue:             playerQueue,
		playerRepository:        playerRepository,
		matchProposalRepository: matchProposalRepository,
		channelFactory:          channelFactory,
		notifier:                notifier,
		accepter:                accepter,
		decliner:                decliner,
	}
}

func (s *FrontendService) FindMatch(ctx context.Context, p *player.Player) (*playerchannel.PlayerChannel, error) {
	channel, err := s.addPlayerToQueue(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("add player to queue: %w", err)
	}

	return channel, nil
}

func (s *FrontendService) addPlayerToQueue(ctx context.Context, p *player.Player) (*playerchannel.PlayerChannel, error) {
	// remove player from other queues
	e, err := s.playerRepository.Load(p.Address())
	if err == nil && e != nil {
		if err := s.playerQueue.Remove(e); err != nil {
			s.logger.Err(err).Msg("remove player from other queue")
		}
	}

	if err := s.playerRepository.Save(p); err != nil {
		return nil, fmt.Errorf("store player: %w", err)
	}

	channel, err := s.channelFactory.Create(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("create channel: %w", err)
	}

	if err := s.playerRepository.SetStatus(p, player.PlayerStatus_CONNECTED); err != nil {
		return nil, fmt.Errorf("set player status to 'CONNECTED': %w", err)
	}

	if err := s.playerQueue.Push(p); err != nil {
		return nil, fmt.Errorf("push player to queue: %w", err)
	}

	return channel, nil
}

func (s *FrontendService) AcceptMatch(ctx context.Context, address proto.Hash) error {
	p, err := s.playerRepository.Load(address)
	if err != nil {
		return fmt.Errorf("load player: %w", err)
	}

	if !p.HasMatchProposalID() {
		return fmt.Errorf("mach proposal is not set: %w", errors.ErrInvalidOperation)
	}

	mu := s.matchProposalRepository.Locker(p.GetMatchProposalID())
	if err := mu.Lock(); err != nil {
		return fmt.Errorf("lock match proposal: %w", err)
	}
	defer func() { _, _ = mu.Unlock() }()

	matchProposal, err := s.matchProposalRepository.Load(p.GetMatchProposalID())
	if err != nil {
		return fmt.Errorf("load match proposal: %w", err)
	}

	if matchProposal == nil || *matchProposal.Timeout() < 0 {
		if err := s.notifier.Message(ctx, events.EventTimeOutMessage{}, p); err != nil {
			return fmt.Errorf("send timeout message: %w", err)
		}

		return fmt.Errorf("match timed out: %w", errors.ErrInvalidOperation)
	}

	if matchProposal.HasAccepted(p.Address()) {
		return nil
	}

	metrics.RecordCommand("match_accepted", p.Mode)

	if err := s.accepter.Accept(ctx, matchProposal, p); err != nil {
		return fmt.Errorf("record match acceptance: %w", err)
	}

	if !matchProposal.HaveAllAccepted() {
		return nil
	}

	matchProposal.SetAccepted()

	if err := s.matchProposalRepository.Save(matchProposal); err != nil {
		return fmt.Errorf("save match proposal: %w", err)
	}

	return nil
}

func (s *FrontendService) DeclineMatch(ctx context.Context, address proto.Hash) error {
	return s.decliner.DeclineMatch(ctx, address)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/channel_factory.go -package mock . ChannelFactory
type ChannelFactory interface {
	Create(context.Context, *player.Player) (*playerchannel.PlayerChannel, error)
}
