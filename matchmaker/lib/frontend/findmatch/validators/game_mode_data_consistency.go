package validators

import (
	"context"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type GameModeDataConsistencyValidator struct {
}

func NewGameModeDataConsistencyValidator() *GameModeDataConsistencyValidator {
	return &GameModeDataConsistencyValidator{}
}

func (v *GameModeDataConsistencyValidator) IsValid(_ context.Context, client *frontend.Client, _ *messages.FindMatchMessage) (bool, error) {
	p := client.Player()

	switch p.Mode {
	case
		proto.GameMode_RANKED_DISCOVERY,
		proto.GameMode_CONQUEST_DISCOVERY:
		if !p.IsRandomDeck {
			return false, errors.ErrDeckIsNotRandom
		}
	case proto.GameMode_CHALLENGE_CONSTRUCTED:
		if len(p.SessionID) == 0 {
			return false, errors.ErrSessionIsEmpty
		}
	case proto.GameMode_CHALLENGE_DISCOVERY:
		if len(p.SessionID) == 0 {
			return false, errors.ErrSessionIsEmpty
		}

		if !p.IsRandomDeck {
			return false, errors.ErrDeckIsNotRandom
		}
	}

	return true, nil
}
