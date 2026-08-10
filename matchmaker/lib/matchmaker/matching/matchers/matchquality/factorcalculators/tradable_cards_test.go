package factorcalculators_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality/factorcalculators"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestTradableCalculator(t *testing.T) {
	calculator := factorcalculators.NewTradableCalculator()

	t.Run("it is 1 when both players have non-tradable cards", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithBaseCards(1),
		)

		p2 := playergen.MustNew(
			playergen.WithBaseCards(1),
		)

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Tradable cards: 1", factor.String())
		assert.Equal(t, float64(15), factor.Scaler())
		assert.Equal(t, float64(-0.5), factor.Exponent())
		assert.Equal(t, float64(1), factor.Value())
	})

	t.Run("it is 0 when at least one player has a tradable card", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithBaseCards(1),
		)

		p2 := playergen.MustNew(
			playergen.WithBaseCards(1),
			playergen.WithSilverCards(2),
		)

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Tradable cards: 0", factor.String())
		assert.Equal(t, float64(15), factor.Scaler())
		assert.Equal(t, float64(-0.5), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())
	})

	t.Run("it is 0 when both players have a tradable card", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithBaseCards(1),
			playergen.WithGoldCards(3),
		)

		p2 := playergen.MustNew(
			playergen.WithBaseCards(1),
			playergen.WithSilverCards(2),
		)

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Tradable cards: 0", factor.String())
		assert.Equal(t, float64(15), factor.Scaler())
		assert.Equal(t, float64(-0.5), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())
	})

	t.Run("it is 0 when at least one player does not have account info", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithBaseCards(1),
		)

		p2 := playergen.MustNew()
		p2.Account = nil

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Tradable cards: 0", factor.String())
		assert.Equal(t, float64(15), factor.Scaler())
		assert.Equal(t, float64(-0.5), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())
	})
}
