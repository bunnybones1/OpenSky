package director_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/director"
	"github.com/horizon-games/OpenSky/matchmaker/lib/director/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
)

func TestRunner(t *testing.T) {
	var matchHandler *mock.MockMatchHandler

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchHandler = mock.NewMockMatchHandler(ctrl)
		}
	}

	runner := director.NewRunner(matchmakertest.NewAssertNoErrorLogger(t), time.Millisecond, matchHandler)

	t.Run("triggers match handler in every interval period until context is cancelled", func(t *testing.T) {
		ctx, cancelFn := context.WithTimeout(context.Background(), time.Minute)
		defer cancelFn()

		matchHandler.EXPECT().HandleMatches(ctx)
		matchHandler.EXPECT().HandleMatches(ctx)
		matchHandler.EXPECT().HandleMatches(ctx).Do(func(_ context.Context) {
			cancelFn()
		})

		wg := sync.WaitGroup{}

		wg.Add(1)
		go func() {
			err := runner.Run(ctx)
			require.NoError(t, err)

			wg.Done()
		}()

		wg.Wait()
	})
}
