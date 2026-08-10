package validators_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators/mock"
	frontendmock "github.com/horizon-games/OpenSky/matchmaker/lib/frontend/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPenaltyValidator(t *testing.T) {
	var penaltyGetter *mock.MockPenaltyGetter

	var messageSender *frontendmock.MockMessageSender

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			penaltyGetter = mock.NewMockPenaltyGetter(ctrl)
			messageSender = frontendmock.NewMockMessageSender(ctrl)
		}
	}

	ctx := context.Background()

	p := playergen.MustNew()

	client := &frontend.Client{}
	client.SetPlayer(p)

	someError := fmt.Errorf("some error")

	validator := validators.NewPenaltyValidator(matchmakertest.NewAssertNoErrorLogger(t), penaltyGetter, messageSender)

	t.Run("is valid when penalty is zero", func(t *testing.T) {
		penalty := time.Duration(0)

		penaltyGetter.EXPECT().GetPenalty(p).Return(penalty, nil)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.NoError(t, err)

		assert.True(t, isValid)
	})

	t.Run("is invalid and sends refusal cooldown message when penalty is greater than zero", func(t *testing.T) {
		penalty := time.Duration(2)

		penaltyGetter.EXPECT().GetPenalty(p).Return(penalty, nil)

		messageSender.EXPECT().SendRefusalCooldownMessage(client, penalty)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.NoError(t, err)

		assert.False(t, isValid)
	})

	t.Run("does not fail when sending refusal cooldown message fails", func(t *testing.T) {
		penalty := time.Duration(2)

		penaltyGetter.EXPECT().GetPenalty(p).Return(penalty, nil)

		messageSender.EXPECT().SendRefusalCooldownMessage(client, penalty).Return(someError)

		validator := validators.NewPenaltyValidator(
			matchmakertest.NewAssertErrorContainsLogger(t, "send refusal cooldown message"),
			penaltyGetter,
			messageSender,
		)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.NoError(t, err)

		assert.False(t, isValid)
	})

	t.Run("fails when getting penalty fails", func(t *testing.T) {
		penalty := time.Duration(2)

		penaltyGetter.EXPECT().GetPenalty(p).Return(penalty, someError)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.ErrorIs(t, err, someError)

		assert.False(t, isValid)
	})
}
