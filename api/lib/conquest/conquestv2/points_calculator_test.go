package conquestv2_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2/mock"
)

func TestPointsCalculator(t *testing.T) {
	var cardPointsCalculator *mock.MockCardPointsCalculator

	var heroSkinFinder *mock.MockHeroSkinFinder

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			cardPointsCalculator = mock.NewMockCardPointsCalculator(ctrl)
			heroSkinFinder = mock.NewMockHeroSkinFinder(ctrl)
		}
	}

	accountID := apitest.RandomAccountID()
	deckString := "deck-string"

	calculator := conquestv2.NewPointsCalculator(cardPointsCalculator, heroSkinFinder)

	t.Run("with hero skin", func(t *testing.T) {
		cardPointsCalculator.EXPECT().FromDeckString(gomock.Any(), accountID, deckString).Return(uint64(10), nil)

		heroSkinFinder.EXPECT().HasFromDeckString(gomock.Any(), accountID, deckString).Return(true, nil)

		points, err := calculator.FromDeckString(context.Background(), accountID, deckString)
		require.NoError(t, err)

		assert.Equalf(t, 18, int(points), "(4 + 10) * 1.25 = 18")
	})

	t.Run("without hero skin", func(t *testing.T) {
		cardPointsCalculator.EXPECT().FromDeckString(gomock.Any(), accountID, deckString).Return(uint64(10), nil)

		heroSkinFinder.EXPECT().HasFromDeckString(gomock.Any(), accountID, deckString).Return(false, nil)

		points, err := calculator.FromDeckString(context.Background(), accountID, deckString)
		require.NoError(t, err)

		assert.Equalf(t, 14, int(points), "4 + 10 = 14")
	})

	t.Run("detailed with hero skin", func(t *testing.T) {
		cardPointsCalculator.EXPECT().DetailedFromDeckString(gomock.Any(), accountID, deckString).Return(&conquestv2.DetailedCardPoints{
			SilverCardPoints: 7,
			GoldCardPoints:   3,
		}, nil)

		heroSkinFinder.EXPECT().HasFromDeckString(gomock.Any(), accountID, deckString).Return(true, nil)

		detailedPoints, err := calculator.DetailedFromDeckString(context.Background(), accountID, deckString)
		require.NoError(t, err)

		assert.Equal(t, 4, int(detailedPoints.MatchPoints))
		assert.Equal(t, 7, int(detailedPoints.SilverCardPoints))
		assert.Equal(t, 3, int(detailedPoints.GoldCardPoints))
		assert.Equal(t, 4, int(detailedPoints.HeroSkinPoints), "(4 + 7 + 3) * 0.25 = 4")
	})
}
