package acceptmatch_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/acceptmatch"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/acceptmatch/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestHandler(t *testing.T) {
	var matchAccepter *mock.MockMatchAccepter

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchAccepter = mock.NewMockMatchAccepter(ctrl)
		}
	}

	p := playergen.MustNew()

	channel := &playerchannel.PlayerChannel{}

	client := &frontend.Client{}
	client.SetPlayer(p)
	client.SetChannel(channel)

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	handler := acceptmatch.NewHandler(matchAccepter)

	t.Run("calls match accepter", func(t *testing.T) {
		matchAccepter.EXPECT().AcceptMatch(ctx, p.Address())

		err := handler.Handle(ctx, client)
		require.NoError(t, err)
	})

	t.Run("fails when match accepter fails", func(t *testing.T) {
		matchAccepter.EXPECT().AcceptMatch(ctx, p.Address()).Return(someError)

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
