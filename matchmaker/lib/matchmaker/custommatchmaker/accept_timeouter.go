package custommatchmaker

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/metrics"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/accept_timeouter.go -package mock . AcceptTimeouter
type AcceptTimeouter interface {
	Schedule(*matchmaker.MatchProposal)
}

type acceptTimeouter struct {
	logger                     zerolog.Logger
	matchProposalRepository    MatchProposalRepository
	playerRepository           PlayerRepository
	accepter                   Accepter
	notifier                   Notifier
	acceptTimeoutPenaltySetter AcceptTimeoutPenaltySetter

	ctx context.Context
}

func NewAcceptTimeouter(
	logger zerolog.Logger,
	matchProposalRepository MatchProposalRepository,
	playerRepository PlayerRepository,
	accepter Accepter,
	notifier Notifier,
	acceptTimeoutPenaltySetter AcceptTimeoutPenaltySetter,
) *acceptTimeouter {
	return &acceptTimeouter{
		logger:                     logger.With().Str("fn", "custommatchmaker.acceptTimeouter").Logger(),
		matchProposalRepository:    matchProposalRepository,
		playerRepository:           playerRepository,
		accepter:                   accepter,
		notifier:                   notifier,
		acceptTimeoutPenaltySetter: acceptTimeoutPenaltySetter,
	}
}

func (t *acceptTimeouter) Run(ctx context.Context) error {
	t.ctx = ctx

	return nil
}

func (t *acceptTimeouter) Schedule(proposal *matchmaker.MatchProposal) {
	go func(proposal *matchmaker.MatchProposal) {
		if proposal.Timeout() == nil {
			return
		}

		timer := time.NewTimer(proposal.Timeout().Abs())
		defer timer.Stop()

		select {
		case <-t.ctx.Done():
			return
		case <-timer.C:
			err := t.checkAcceptanceTimeout(proposal.ID())
			if err != nil {
				t.logger.Err(err).Msg("check acceptance timeout")
			}
		}
	}(proposal)
}

func (t *acceptTimeouter) checkAcceptanceTimeout(proposalID string) error {
	mu := t.matchProposalRepository.Locker(proposalID)
	if err := mu.Lock(); err != nil {
		return fmt.Errorf("lock match proposal: %w", err)
	}
	defer func() { _, _ = mu.Unlock() }()

	matchProposal, err := t.matchProposalRepository.Load(proposalID)
	if err != nil {
		return fmt.Errorf("load match proposal: %w", err)
	}

	if matchProposal == nil {
		return nil
	}

	if matchProposal.Timeout() == nil || *matchProposal.Timeout() > 0 {
		return fmt.Errorf("match is more recent than expected")
	}

	if matchProposal.HaveAllAccepted() {
		return nil // nothing to do
	}

	if matchProposal.IsConquest() {
		for _, address := range matchProposal.Addresses() {
			if !matchProposal.HasAccepted(address) {
				p, err := t.playerRepository.Load(address)
				if err != nil {
					return fmt.Errorf("load player: %w", err)
				}

				if err := t.accepter.Accept(context.Background(), matchProposal, p); err != nil {
					return fmt.Errorf("auto-accept match: %w", err)
				}
			}
		}

		matchProposal.SetAccepted()

		if err := t.matchProposalRepository.Save(matchProposal); err != nil {
			return fmt.Errorf("save match proposal: %w", err)
		}

		return nil
	}

	for gameMode, ok := range matchProposal.GameModes() {
		if !ok {
			continue
		}

		metrics.RecordCommand("match_aborted", gameMode)
	}

	if err := t.matchProposalRepository.Delete(matchProposal); err != nil {
		t.logger.Err(err).Msg("delete match proposal")
	}

	for _, address := range matchProposal.Addresses() {
		p, err := t.playerRepository.Load(address)
		if err != nil {
			t.logger.Err(err).Msg("load player")
			continue
		}

		if err := t.playerRepository.Delete(p); err != nil {
			t.logger.Err(err).Msg("delete player")
		}

		playerStatus := player.PlayerStatus_MATCH_TIMED_OUT

		if matchProposal.HasAccepted(address) {
			playerStatus = player.PlayerStatus_MATCH_ABORTED
		}

		if err := t.playerRepository.SetStatus(p, playerStatus); err != nil {
			t.logger.Err(err).Msg("set player status")
		}

		if err := t.notifier.Message(context.Background(), events.EventTimeOutMessage{}, p); err != nil {
			t.logger.Err(err).Msg("send timeout message")
		}

		if p.IsChallengeMatch() {
			continue
		}

		if matchProposal.HasAccepted(address) {
			continue
		}

		if err := t.acceptTimeoutPenaltySetter.SetAcceptTimeoutPenalty(p); err != nil {
			t.logger.Err(err).Msg("set accept timeout penalty")
		}
	}

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/accept_timeout_penalty_setter.go -package mock . AcceptTimeoutPenaltySetter
type AcceptTimeoutPenaltySetter interface {
	SetAcceptTimeoutPenalty(*player.Player) error
}
