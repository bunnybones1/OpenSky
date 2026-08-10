package matchquality_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestQualitySorter(t *testing.T) {
	var qualityCalculator *mock.MockQualityCalculator

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			qualityCalculator = mock.NewMockQualityCalculator(ctrl)
		}
	}

	p1 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	p2 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	p3 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	sorter := matchquality.NewQualitySorter(qualityCalculator)

	t.Run("sorts candidates by quality when lower value comes first", func(t *testing.T) {
		candidates := []*player.Player{p2, p3}

		qualityCalculator.EXPECT().Calculate(p1, p2).Return(float64(10))
		qualityCalculator.EXPECT().Calculate(p1, p3).Return(float64(5))

		sorter.Sort(p1, candidates)

		assert.Equal(t, p3, candidates[0])
		assert.Equal(t, p2, candidates[1])
	})
}
