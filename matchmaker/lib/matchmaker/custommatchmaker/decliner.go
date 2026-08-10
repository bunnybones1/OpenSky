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
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/decliner.go -package mock . Decliner
type Decliner interface {
	DeclineMatch(context.Context, proto.Hash) error
}

type decliner struct {
	logger                  zerolog.Logger
	playerRepository        PlayerRepository
	playerQueue             PlayerQueue
	matchProposalRepository MatchProposalRepository
	notifier                Notifier
	refusalPenaltySetter    RefusalPenaltySetter
}

func NewDecliner(
	logger zerolog.Logger,
	playerRepository PlayerRepository,
	playerQueue PlayerQueue,
	matchProposalRepository MatchProposalRepository,
	notifier Notifier,
	refusalPenaltySetter RefusalPenaltySetter,
) *decliner {
	return &decliner{
		logger:                  logger.With().Str("fn", "custommatchmaker.Decliner").Logger(),
		playerRepository:        playerRepository,
		playerQueue:             playerQueue,
		matchProposalRepository: matchProposalRepository,
		notifier:                notifier,
		refusalPenaltySetter:    refusalPenaltySetter,
	}
}

func (d *decliner) DeclineMatch(ctx context.Context, address proto.Hash) error {
	p, err := d.playerRepository.Load(address)
	if err != nil {
		return fmt.Errorf("load player: %w", err)
	}

	if err := d.playerQueue.Remove(p); err != nil {
		d.logger.Err(err).Msg("remove player from queue")
	}

	hasMatchProposal, err := d.matchProposalRepository.HasMatchProposal(p.Address())
	if err != nil {
		return fmt.Errorf("has match proposal: %w", err)
	}

	if !hasMatchProposal {
		return nil
	}

	if p.IsConquestMatch() {
		return fmt.Errorf("conquest cannot be declined: %w", errors.ErrInvalidOperation)
	}

	mu := d.matchProposalRepository.Locker(p.GetMatchProposalID())
	if err := mu.Lock(); err != nil {
		return fmt.Errorf("lock match proposal: %w", err)
	}
	defer func() { _, _ = mu.Unlock() }()

	matchProposal, err := d.matchProposalRepository.Load(p.GetMatchProposalID())
	if err != nil {
		return fmt.Errorf("load match proposal: %w", err)
	}

	if matchProposal == nil {
		return nil
	}

	declineMessage := events.EventDeclinedMessage{
		PlayerID: p.Address(),
	}

	players := []*player.Player{p}

	for _, playerAddress := range matchProposal.Addresses() {
		if playerAddress == p.Address() {
			continue
		}

		playerX, err := d.playerRepository.Load(playerAddress)
		if err != nil {
			return fmt.Errorf("load opponent: %w", err)
		}

		if playerX == nil {
			continue
		}

		players = append(players, playerX)
	}

	if err := d.notifier.Message(ctx, declineMessage, players...); err != nil {
		return fmt.Errorf("send decline message: %w", err)
	}

	metrics.RecordCommand("match_declined", p.Mode)

	if err := d.matchProposalRepository.Delete(matchProposal); err != nil {
		return fmt.Errorf("delete match proposal: %w", err)
	}

	if p.IsChallengeMatch() {
		return nil
	}

	if err := d.refusalPenaltySetter.SetRefusalPenalty(p); err != nil {
		return fmt.Errorf("set refusal penalty: %w", err)
	}

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/refusal_penalty_setter.go -package mock . RefusalPenaltySetter
type RefusalPenaltySetter interface {
	SetRefusalPenalty(*player.Player) error
}
