package matchquality_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestQualityCalculator(t *testing.T) {
	var factorCalculator1, factorCalculator2 *mock.MockFactorCalculator

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			factorCalculator1 = mock.NewMockFactorCalculator(ctrl)
			factorCalculator2 = mock.NewMockFactorCalculator(ctrl)
		}
	}

	p1 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	p2 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	calculator := matchquality.NewQualityCalculator(factorCalculator1, factorCalculator2)

	factorCalculator1.EXPECT().Calculate(p1, p2).Return(matchquality.NewFactor("foo", 1, 1, 1))
	factorCalculator2.EXPECT().Calculate(p1, p2).Return(matchquality.NewFactor("bar", 2, 2, 2))

	quality := calculator.Calculate(p1, p2)
	assert.InDelta(t, 3.684, quality, 0.001)
}
