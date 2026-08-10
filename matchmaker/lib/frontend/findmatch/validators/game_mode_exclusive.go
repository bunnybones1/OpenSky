package validators

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type GameModeExclusiveValidator struct {
	gameModes  map[proto.GameMode]bool
	validators []findmatch.Validator
}

func NewGameModeExclusiveValidator(gameModes []proto.GameMode, validators ...findmatch.Validator) *GameModeExclusiveValidator {
	gm := make(map[proto.GameMode]bool)

	for _, gameMode := range gameModes {
		gm[gameMode] = true
	}

	return &GameModeExclusiveValidator{
		gameModes:  gm,
		validators: validators,
	}
}

func (v *GameModeExclusiveValidator) IsValid(ctx context.Context, client *frontend.Client, msg *messages.FindMatchMessage) (bool, error) {
	if _, ok := v.gameModes[msg.Mode]; !ok {
		return true, nil
	}

	for i := 0; i < len(v.validators); i++ {
		validator := v.validators[i]

		isValid, err := validator.IsValid(ctx, client, msg)
		if err != nil {
			return isValid, fmt.Errorf("validator #%d: %w", i, err)
		}

		if !isValid {
			return false, nil
		}
	}

	return true, nil
}
