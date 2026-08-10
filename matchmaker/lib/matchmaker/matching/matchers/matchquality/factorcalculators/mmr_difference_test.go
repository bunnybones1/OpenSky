package factorcalculators_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality/factorcalculators"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestMMRDifferenceCalculator(t *testing.T) {
	p1 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
		playergen.WithScore(10),
	)

	p2 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
		playergen.WithScore(20),
	)

	calculator := factorcalculators.NewMMRDifferenceCalculator()

	factor := calculator.Calculate(p1, p2)
	assert.Equal(t, "MMR Difference: 10", factor.String())
	assert.Equal(t, float64(0.05), factor.Scaler())
	assert.Equal(t, float64(5), factor.Exponent())
	assert.Equal(t, float64(10), factor.Value())
}
