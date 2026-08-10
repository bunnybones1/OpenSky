package custommatchmaker

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/accepter.go -package mock . Accepter
type Accepter interface {
	Accept(context.Context, *matchmaker.MatchProposal, *player.Player) error
}

type accepter struct {
	matchProposalRepository MatchProposalRepository
	playerRepository        PlayerRepository
	notifier                Notifier
}

func NewAccepter(
	matchProposalRepository MatchProposalRepository,
	playerRepository PlayerRepository,
	notifier Notifier,
) *accepter {
	return &accepter{
		matchProposalRepository: matchProposalRepository,
		playerRepository:        playerRepository,
		notifier:                notifier,
	}
}

func (a *accepter) Accept(ctx context.Context, matchProposal *matchmaker.MatchProposal, p *player.Player) error {
	acceptedMessage := events.EventAcceptedMessage{
		PlayerID: p.Address(),
	}

	matchProposal.AcceptByPlayer(p)

	if err := a.matchProposalRepository.Save(matchProposal); err != nil {
		return fmt.Errorf("save match proposal: %w", err)
	}

	if err := a.playerRepository.SetStatus(p, player.PlayerStatus_MATCH_ACCEPTED); err != nil {
		return fmt.Errorf("set player status to 'MATCH_ACCEPTED': %w", err)
	}

	for _, address := range matchProposal.Addresses() {
		if err := a.notifier.Message(ctx, acceptedMessage, player.NewWithAddress(address)); err != nil {
			return fmt.Errorf("send accepted message to player %q: %w", address, err)
		}
	}

	return nil
}
