package factorcalculators_test

import (
	"fmt"
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality/factorcalculators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality/factorcalculators/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerstats"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestRematchCalculator(t *testing.T) {
	var playerStatsRetriever *mock.MockPlayerStatsRetriever

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			playerStatsRetriever = mock.NewMockPlayerStatsRetriever(ctrl)
		}
	}

	p1 := playergen.MustNew()
	p2 := playergen.MustNew()

	calculator := factorcalculators.NewRematchCalculator(zerolog.Nop(), playerStatsRetriever)

	t.Run("it is 1 when players' last match was against each other", func(t *testing.T) {
		statsSummary1 := &playerstats.StatsSummary{
			Stats: []playerstats.Stat{
				{
					OpponentID: p2.Address(),
				},
			},
		}
		statsSummary2 := &playerstats.StatsSummary{
			Stats: []playerstats.Stat{
				{
					OpponentID: p1.Address(),
				},
			},
		}

		playerStatsRetriever.EXPECT().Retrieve(p1.Address()).Return(statsSummary1, nil)
		playerStatsRetriever.EXPECT().Retrieve(p2.Address()).Return(statsSummary2, nil)

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Rematch: 1", factor.String())
		assert.Equal(t, float64(40), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(1), factor.Value())
	})

	t.Run("it is 1 when at least one of the player`s last match is against each other", func(t *testing.T) {
		statsSummary1 := &playerstats.StatsSummary{
			Stats: []playerstats.Stat{
				{
					OpponentID: p2.Address(),
				},
			},
		}
		statsSummary2 := &playerstats.StatsSummary{
			Stats: []playerstats.Stat{
				{
					OpponentID: "123",
				},
			},
		}

		playerStatsRetriever.EXPECT().Retrieve(p1.Address()).Return(statsSummary1, nil)
		playerStatsRetriever.EXPECT().Retrieve(p2.Address()).Return(statsSummary2, nil)

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Rematch: 1", factor.String())
		assert.Equal(t, float64(40), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(1), factor.Value())
	})

	t.Run("it is 0 when a player does not have stored tats", func(t *testing.T) {
		statsSummary := &playerstats.StatsSummary{}

		playerStatsRetriever.EXPECT().Retrieve(p1.Address()).Return(statsSummary, nil)
		playerStatsRetriever.EXPECT().Retrieve(p2.Address()).Return(nil, nil)

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Rematch: 0", factor.String())
		assert.Equal(t, float64(40), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())

		playerStatsRetriever.EXPECT().Retrieve(p1.Address()).Return(nil, nil)
		playerStatsRetriever.EXPECT().Retrieve(p2.Address()).Return(statsSummary, nil)

		factor = calculator.Calculate(p1, p2)
		assert.Equal(t, "Rematch: 0", factor.String())
		assert.Equal(t, float64(40), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())
	})

	t.Run("it is 0 when a player does not have stats", func(t *testing.T) {
		noStatsSummary := &playerstats.StatsSummary{}
		someStatsSummary := &playerstats.StatsSummary{
			Stats: []playerstats.Stat{
				{
					OpponentID: "123",
				},
			},
		}

		playerStatsRetriever.EXPECT().Retrieve(p1.Address()).Return(noStatsSummary, nil)
		playerStatsRetriever.EXPECT().Retrieve(p2.Address()).Return(someStatsSummary, nil)

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Rematch: 0", factor.String())
		assert.Equal(t, float64(40), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())

		playerStatsRetriever.EXPECT().Retrieve(p1.Address()).Return(someStatsSummary, nil)
		playerStatsRetriever.EXPECT().Retrieve(p2.Address()).Return(noStatsSummary, nil)

		factor = calculator.Calculate(p1, p2)
		assert.Equal(t, "Rematch: 0", factor.String())
		assert.Equal(t, float64(40), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())
	})

	t.Run("it is 0 when retrieving player stats fails", func(t *testing.T) {
		someStatsSummary := &playerstats.StatsSummary{
			Stats: []playerstats.Stat{
				{
					OpponentID: "123",
				},
			},
		}

		playerStatsRetriever.EXPECT().Retrieve(p1.Address()).Return(nil, fmt.Errorf("error"))

		factor := calculator.Calculate(p1, p2)
		assert.Equal(t, "Rematch: 0", factor.String())
		assert.Equal(t, float64(40), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())

		playerStatsRetriever.EXPECT().Retrieve(p1.Address()).Return(someStatsSummary, nil)
		playerStatsRetriever.EXPECT().Retrieve(p2.Address()).Return(nil, fmt.Errorf("error"))

		factor = calculator.Calculate(p1, p2)
		assert.Equal(t, "Rematch: 0", factor.String())
		assert.Equal(t, float64(40), factor.Scaler())
		assert.Equal(t, float64(1), factor.Exponent())
		assert.Equal(t, float64(0), factor.Value())
	})
}
