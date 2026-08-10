package validators_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPendingMatchValidator(t *testing.T) {
	var pendingMatchChecker *mock.MockPendingMatchChecker

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			pendingMatchChecker = mock.NewMockPendingMatchChecker(ctrl)
		}
	}

	p := playergen.MustNew()

	client := newClient(matchmakertest.NewAssertNoErrorLogger(t))
	client.SetPlayer(p)

	someError := fmt.Errorf("error")

	ctx := context.Background()

	validator := validators.NewPendingMatchValidator(pendingMatchChecker)

	tests := []struct {
		name                     string
		hasPendingMatch          bool
		findingPendingMatchError error
		isValid                  bool
		errorContains            string
		errorIs                  error
	}{
		{
			name:    "valid when there is no pending match",
			isValid: true,
		},
		{
			name:            "invalid when there is pending match",
			hasPendingMatch: true,
			isValid:         false,
			errorContains:   "there is pending match already",
		},
		{
			name:                     "fails when finding pending match fails",
			findingPendingMatchError: someError,
			isValid:                  false,
			errorIs:                  someError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pendingMatchChecker.EXPECT().HasMatchProposal(p.Address()).Return(tt.hasPendingMatch, tt.findingPendingMatchError)

			isValid, err := validator.IsValid(ctx, client, nil)
			if len(tt.errorContains) > 0 {
				require.ErrorContains(t, err, tt.errorContains)
			} else if tt.errorIs != nil {
				require.ErrorIs(t, err, tt.errorIs)
			} else {
				require.NoError(t, err)
			}

			assert.Equal(t, tt.isValid, isValid)
		})
	}
}
