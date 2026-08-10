package factorcalculators_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality/factorcalculators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestSameHeroCalculator(t *testing.T) {
	calculator := factorcalculators.NewSameHeroCalculator()

	t.Run("it is 1 when heroes are the same", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithPrisms(player.Prism(proto.CardClass_STR)),
		)

		p2 := playergen.MustNew(
			playergen.WithPrisms(player.Prism(proto.CardClass_STR)),
		)

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Mirror Match: 1", factor.String())
		assert.Equal(t, float64(5), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(1), factor.Value())
	})

	t.Run("it is 0 when heroes are different", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithPrisms(player.Prism(proto.CardClass_STR)),
		)

		p2 := playergen.MustNew(
			playergen.WithPrisms(player.Prism(proto.CardClass_INT)),
		)

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Mirror Match: 0", factor.String())
		assert.Equal(t, float64(5), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())
	})
}
