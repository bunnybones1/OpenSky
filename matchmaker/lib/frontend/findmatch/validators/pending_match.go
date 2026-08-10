package validators

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type PendingMatchValidator struct {
	pendingMatchChecker PendingMatchChecker
}

func NewPendingMatchValidator(pendingMatchChecker PendingMatchChecker) *PendingMatchValidator {
	return &PendingMatchValidator{
		pendingMatchChecker: pendingMatchChecker,
	}
}

func (v *PendingMatchValidator) IsValid(_ context.Context, client *frontend.Client, _ *messages.FindMatchMessage) (bool, error) {
	has, err := v.pendingMatchChecker.HasMatchProposal(client.Player().Address())
	if err != nil {
		return false, fmt.Errorf("has pending match: %w", err)
	}

	if has {
		return false, fmt.Errorf("there is pending match already")
	}

	return true, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/pending_match_checker.go -package mock . PendingMatchChecker
type PendingMatchChecker interface {
	HasMatchProposal(proto.Hash) (bool, error)
}
