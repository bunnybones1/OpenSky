package validators_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/proto"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestGameModeDataConsistencyValidator(t *testing.T) {
	validator := validators.NewGameModeDataConsistencyValidator()

	ctx := context.Background()

	tests := []struct {
		name          string
		gameMode      proto.GameMode
		randomDeck    bool
		sessionID     string
		isValid       bool
		expectedError error
	}{
		{
			name:       "valid when ranked discovery has random deck",
			gameMode:   proto.GameMode_RANKED_DISCOVERY,
			randomDeck: true,
			isValid:    true,
		},
		{
			name:          "invalid when ranked discovery does not have random deck",
			gameMode:      proto.GameMode_RANKED_DISCOVERY,
			randomDeck:    false,
			isValid:       false,
			expectedError: mmerrors.ErrDeckIsNotRandom,
		},
		{
			name:       "valid when conquest discovery has random deck",
			gameMode:   proto.GameMode_CONQUEST_DISCOVERY,
			randomDeck: true,
			isValid:    true,
		},
		{
			name:          "invalid when conquest discovery does not have random deck",
			gameMode:      proto.GameMode_CONQUEST_DISCOVERY,
			isValid:       false,
			expectedError: mmerrors.ErrDeckIsNotRandom,
		},
		{
			name:      "valid when challenge constructed has session ID",
			gameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			sessionID: "foo",
			isValid:   true,
		},
		{
			name:          "invalid when challenge constructed does not have session ID",
			gameMode:      proto.GameMode_CHALLENGE_CONSTRUCTED,
			sessionID:     "",
			isValid:       false,
			expectedError: mmerrors.ErrSessionIsEmpty,
		},
		{
			name:       "valid when challenge discovery has session ID and random deck",
			gameMode:   proto.GameMode_CHALLENGE_DISCOVERY,
			randomDeck: true,
			sessionID:  "foo",
			isValid:    true,
		},
		{
			name:          "invalid when challenge discovery does not have session ID and random deck",
			gameMode:      proto.GameMode_CHALLENGE_DISCOVERY,
			randomDeck:    false,
			sessionID:     "",
			isValid:       false,
			expectedError: mmerrors.ErrSessionIsEmpty,
		},
		{
			name:     "valid for any other game mode",
			gameMode: proto.GameMode_PRACTICE_PVP,
			isValid:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := playergen.MustNew(
				playergen.WithMode(tt.gameMode),
				playergen.WithSessionID(tt.sessionID),
			)

			p.IsRandomDeck = tt.randomDeck

			client := newClient(matchmakertest.NewAssertNoErrorLogger(t))
			client.SetPlayer(p)

			isValid, err := validator.IsValid(ctx, client, nil)
			require.Equal(t, tt.expectedError, err)
			assert.Equal(t, tt.isValid, isValid)
		})
	}
}
