package declinematch_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/declinematch"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/declinematch/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestHandler(t *testing.T) {
	var matchDecliner *mock.MockMatchDecliner

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchDecliner = mock.NewMockMatchDecliner(ctrl)
		}
	}

	p := playergen.MustNew()

	channel := &playerchannel.PlayerChannel{}

	client := &frontend.Client{}
	client.SetPlayer(p)
	client.SetChannel(channel)

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	handler := declinematch.NewHandler(matchDecliner)

	t.Run("calls match decliner", func(t *testing.T) {
		matchDecliner.EXPECT().DeclineMatch(ctx, p.Address())

		err := handler.Handle(ctx, client)
		require.NoError(t, err)
	})

	t.Run("fails when match decliner fails", func(t *testing.T) {
		matchDecliner.EXPECT().DeclineMatch(ctx, p.Address()).Return(someError)

		err := handler.Handle(ctx, client)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when client does not have player", func(t *testing.T) {
		client := &frontend.Client{}
		client.SetChannel(channel)

		err := handler.Handle(ctx, client)
		require.ErrorIs(t, err, errors.ErrMissingPlayer)
	})

	t.Run("fails when client does not have channel", func(t *testing.T) {
		client := &frontend.Client{}

		err := handler.Handle(ctx, client)
		require.ErrorIs(t, err, errors.ErrMissingChannel)
	})
}
