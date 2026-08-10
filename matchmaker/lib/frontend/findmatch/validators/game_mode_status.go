package validators

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type GameModeStatusValidator struct {
	gameModeStatusChecker GameModeStatusChecker
}

func NewGameModeStatusValidator(gameModeStatusChecker GameModeStatusChecker) *GameModeStatusValidator {
	return &GameModeStatusValidator{
		gameModeStatusChecker: gameModeStatusChecker,
	}
}

func (v *GameModeStatusValidator) IsValid(ctx context.Context, _ *frontend.Client, msg *messages.FindMatchMessage) (bool, error) {
	status, err := v.gameModeStatusChecker.IsEnabled(ctx, msg.Mode)
	if err != nil {
		return false, fmt.Errorf("game mode status check: %w", err)
	}

	if !status {
		return false, mmerrors.ErrGameModeDisabled
	}

	return true, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/game_mode_status_checker.go -package mock . GameModeStatusChecker
type GameModeStatusChecker interface {
	IsEnabled(context.Context, proto.GameMode) (bool, error)
}
