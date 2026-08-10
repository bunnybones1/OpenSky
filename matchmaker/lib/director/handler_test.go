package director_test

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/director"
	"github.com/horizon-games/OpenSky/matchmaker/lib/director/mock"
)

func TestHandler(t *testing.T) {
	var runner1, runner2 *mock.MockRunner

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			runner1 = mock.NewMockRunner(ctrl)
			runner2 = mock.NewMockRunner(ctrl)
		}
	}

	someError := fmt.Errorf("some error")

	handler := director.NewHandler(runner1, runner2)

	t.Run("triggers all runners and runs until context is cancelled", func(t *testing.T) {
		ctx, cancelFn := context.WithTimeout(context.Background(), time.Minute)
		defer cancelFn()

		runner1.EXPECT().Run(gomock.Any()).DoAndReturn(func(ctx context.Context) error {
			<-ctx.Done()

			return nil
		})

		runner2.EXPECT().Run(gomock.Any()).DoAndReturn(func(ctx context.Context) error {
			<-ctx.Done()

			return nil
		})

		wg := sync.WaitGroup{}

		wg.Add(1)
		go func() {
			err := handler.Run(ctx)
			require.NoError(t, err)

			wg.Done()
		}()

		cancelFn()

		wg.Wait()
	})

	t.Run("returns error and cancels other runners when one of runners returns error", func(t *testing.T) {
		ctx, cancelFn := context.WithTimeout(context.Background(), time.Minute)
		defer cancelFn()

		runner1.EXPECT().Run(gomock.Any()).DoAndReturn(func(ctx context.Context) error {
			<-ctx.Done()

			return nil
		})

		runner2.EXPECT().Run(gomock.Any()).Return(someError)

		wg := sync.WaitGroup{}

		wg.Add(1)
		go func() {
			err := handler.Run(ctx)
			require.ErrorIs(t, err, someError)

			wg.Done()
		}()

		wg.Wait()
	})
}
