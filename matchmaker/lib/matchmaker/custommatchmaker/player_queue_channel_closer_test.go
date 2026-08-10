package custommatchmaker_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPlayerQueueChannelCloser(t *testing.T) {
	var playerQueue *mock.MockPlayerQueue

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			playerQueue = mock.NewMockPlayerQueue(ctrl)
		}
	}

	p := playergen.MustNew()
	channel := playerchannel.New(nil, p)

	someError := fmt.Errorf("some error")

	closer := custommatchmaker.NewPlayerQueueChannelCloser(matchmakertest.NewAssertNoErrorLogger(t), playerQueue)

	t.Run("removes from queue", func(t *testing.T) {
		playerQueue.EXPECT().Remove(p)

		err := closer.Close(channel)
		require.NoError(t, err)
	})

	t.Run("does not fail when removing from queue fails", func(t *testing.T) {
		playerQueue.EXPECT().Remove(p).Return(someError)

		closer := custommatchmaker.NewPlayerQueueChannelCloser(
			matchmakertest.NewAssertErrorContainsLogger(t, "remove player from queue"),
			playerQueue,
		)

		err := closer.Close(channel)
		require.NoError(t, err)
	})

	t.Run("does nothing when channel has no player", func(t *testing.T) {
		channel := &playerchannel.PlayerChannel{}

		err := closer.Close(channel)
		require.NoError(t, err)
	})
}
