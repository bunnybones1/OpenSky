package conquestv2_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestSummaryGetter(t *testing.T) {
	ctx := context.Background()

	var poolGetter *mock.MockPoolGetter

	var treasureLevelSummaryGetter *mock.MockTreasureLevelSummaryGetter

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			poolGetter = mock.NewMockPoolGetter(ctrl)
			treasureLevelSummaryGetter = mock.NewMockTreasureLevelSummaryGetter(ctrl)
		}
	}

	poolAmount := uint64(100)

	treasureLevels := []*proto.ConquestV2TreasureLevelSummary{
		{
			Level:           1,
			NumberOfPlayers: 3,
			TotalWeight:     3,
		},
		{
			Level:           2,
			NumberOfPlayers: 2,
			TotalWeight:     6.38,
		},
	}

	someError := fmt.Errorf("some error")

	summaryGetter := conquestv2.NewSummaryGetter(poolGetter, treasureLevelSummaryGetter)

	t.Run("success", func(t *testing.T) {
		poolGetter.EXPECT().GetPool(gomock.Any()).Return(&proto.ConquestV2Pool{Amount: poolAmount}, nil)
		treasureLevelSummaryGetter.EXPECT().Get(gomock.Any()).Return(treasureLevels, nil)

		summary, err := summaryGetter.Get(ctx)
		require.NoError(t, err)

		assert.NotNil(t, summary)
		assert.Equal(t, poolAmount, summary.Pool)
		assert.Equal(t, float32(9.38), summary.TotalWeight)
		assert.Equal(t, float32(10.661), summary.WeightUnitPrice)
		assert.Equal(t, treasureLevels, summary.TreasureLevels)
	})

	t.Run("fails when getting pool fails", func(t *testing.T) {
		poolGetter.EXPECT().GetPool(gomock.Any()).Return(nil, someError)

		summary, err := summaryGetter.Get(ctx)
		require.ErrorIs(t, err, someError)
		assert.Nil(t, summary)
	})

	t.Run("fails when getting treasure levels fails", func(t *testing.T) {
		poolGetter.EXPECT().GetPool(gomock.Any()).Return(&proto.ConquestV2Pool{Amount: poolAmount}, nil)
		treasureLevelSummaryGetter.EXPECT().Get(gomock.Any()).Return(nil, someError)

		summary, err := summaryGetter.Get(ctx)
		require.ErrorIs(t, err, someError)
		assert.Nil(t, summary)
	})
}
