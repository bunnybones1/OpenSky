package custommatchmaker_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestDeclineMatchChannelCloser(t *testing.T) {
	var decliner *mock.MockDecliner

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			decliner = mock.NewMockDecliner(ctrl)
		}
	}

	p := playergen.MustNew()
	channel := playerchannel.New(nil, p)

	someError := fmt.Errorf("some error")

	closer := custommatchmaker.NewDeclineMatchChannelCloser(decliner)

	t.Run("declines a match", func(t *testing.T) {
		decliner.EXPECT().DeclineMatch(gomock.Any(), p.Address())

		err := closer.Close(channel)
		require.NoError(t, err)
	})

	t.Run("fails when declining match fails", func(t *testing.T) {
		decliner.EXPECT().DeclineMatch(gomock.Any(), p.Address()).Return(someError)

		err := closer.Close(channel)
		require.ErrorIs(t, err, someError)
	})

	t.Run("does not fail when declining match fails because of missing player", func(t *testing.T) {
		decliner.EXPECT().DeclineMatch(gomock.Any(), p.Address()).Return(mmerrors.ErrMissingPlayer)

		err := closer.Close(channel)
		require.NoError(t, err)
	})

	t.Run("does nothing when channel has no player", func(t *testing.T) {
		channel := &playerchannel.PlayerChannel{}

		err := closer.Close(channel)
		require.NoError(t, err)
	})
}
