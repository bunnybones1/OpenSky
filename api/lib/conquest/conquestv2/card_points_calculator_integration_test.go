//go:build integration

package conquestv2_test

import (
	"context"
	"testing"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestCardPointsCalculator(t *testing.T) {
	ctx := apitest.DBContext(context.Background())

	var accountID proto.AccountID

	var deckString string

	var cardIDs []uint64

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestCardPointsCalculator")
			require.NoError(t, err)
		}

		// Decks
		{
			err := data.CreateStarterDecks(data.DB, accountID)
			require.NoError(t, err)

			deck, err := data.DB.Decks().FindOne(db.Cond{"account_id": accountID, "deck_type": proto.DeckType_UNLOCKED_STARTER})
			require.NoError(t, err)

			cardIDs = deck.CardIDs
			deckString = deck.DeckString
		}
	}

	calculator := conquestv2.NewCardPointsCalculator()

	t.Run("returns 0 points when the deck has no silver or gold cards", func(t *testing.T) {
		points, err := calculator.FromDeckString(ctx, accountID, deckString)
		require.NoError(t, err)

		assert.Equal(t, 0, int(points))
	})

	t.Run("returns 1 point for each silver card when the deck has 2 silver cards", func(t *testing.T) {
		// Setup silver cards
		{
			for _, cardID := range cardIDs[0:2] {
				err := data.DB.Items(nil).InsertReturning(&proto.Item{
					AccountID:       accountID,
					ContractAddress: nil,
					ItemType:        proto.ItemType_SW_SILVER_CARDS,
					TokenID:         cardID,
					Balance:         prototyp.NewBigInt(5),
				})
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				result := data.DB.Items(nil).Find(db.Cond{
					"account_id": accountID,
					"item_type":  db.NotEq(proto.ItemType_SW_BASE_CARDS),
				})
				err := result.Delete()
				require.NoError(t, err)
			})
		}

		points, err := calculator.FromDeckString(ctx, accountID, deckString)
		require.NoError(t, err)

		assert.Equal(t, 2, int(points))
	})

	t.Run("returns 1 point for a silver card and 3 points for every gold card when the deck has 2 silver cards and 2 gold cards and one of the cards is both silver and gold", func(t *testing.T) {
		// Setup silver cards and gold cards
		{
			// Silver cards
			for _, cardID := range cardIDs[0:2] {
				err := data.DB.Items(nil).InsertReturning(&proto.Item{
					AccountID:       accountID,
					ContractAddress: nil,
					ItemType:        proto.ItemType_SW_SILVER_CARDS,
					TokenID:         cardID,
					Balance:         prototyp.NewBigInt(5),
				})
				require.NoError(t, err)
			}

			// Gold cards with 1 card overlapping with silver cards
			for _, cardID := range cardIDs[1:3] {
				err := data.DB.Items(nil).InsertReturning(&proto.Item{
					AccountID:       accountID,
					ContractAddress: nil,
					ItemType:        proto.ItemType_SW_GOLD_CARDS,
					TokenID:         cardID,
					Balance:         prototyp.NewBigInt(5),
				})
				require.NoError(t, err)
			}

			// Gold cards with zero balance that should not be included.
			for _, cardID := range cardIDs[3:4] {
				err := data.DB.Items(nil).InsertReturning(&proto.Item{
					AccountID:       accountID,
					ContractAddress: nil,
					ItemType:        proto.ItemType_SW_GOLD_CARDS,
					TokenID:         cardID,
					Balance:         prototyp.NewBigInt(0),
				})
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				result := data.DB.Items(nil).Find(db.Cond{
					"account_id": accountID,
					"item_type":  db.NotIn(proto.ItemType_SW_BASE_CARDS),
				})
				err := result.Delete()
				require.NoError(t, err)
			})
		}

		points, err := calculator.FromDeckString(ctx, accountID, deckString)
		require.NoError(t, err)

		assert.Equal(t, 7, int(points))
	})

	t.Run("returns detailed points when the deck has 2 silver cards and 2 gold cards and one of the cards is both silver and gold", func(t *testing.T) {
		// Setup silver cards and gold cards
		{
			// Silver cards
			for _, cardID := range cardIDs[0:2] {
				err := data.DB.Items(nil).InsertReturning(&proto.Item{
					AccountID:       accountID,
					ContractAddress: nil,
					ItemType:        proto.ItemType_SW_SILVER_CARDS,
					TokenID:         cardID,
					Balance:         prototyp.NewBigInt(5),
				})
				require.NoError(t, err)
			}

			// Gold cards with 1 card overlapping with silver cards
			for _, cardID := range cardIDs[1:3] {
				err := data.DB.Items(nil).InsertReturning(&proto.Item{
					AccountID:       accountID,
					ContractAddress: nil,
					ItemType:        proto.ItemType_SW_GOLD_CARDS,
					TokenID:         cardID,
					Balance:         prototyp.NewBigInt(5),
				})
				require.NoError(t, err)
			}

			// Gold cards with zero balance that should not be included.
			for _, cardID := range cardIDs[3:4] {
				err := data.DB.Items(nil).InsertReturning(&proto.Item{
					AccountID:       accountID,
					ContractAddress: nil,
					ItemType:        proto.ItemType_SW_GOLD_CARDS,
					TokenID:         cardID,
					Balance:         prototyp.NewBigInt(0),
				})
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				result := data.DB.Items(nil).Find(db.Cond{
					"account_id": accountID,
					"item_type":  db.NotIn(proto.ItemType_SW_BASE_CARDS),
				})
				err := result.Delete()
				require.NoError(t, err)
			})
		}

		detailedCardPoints, err := calculator.DetailedFromDeckString(ctx, accountID, deckString)
		require.NoError(t, err)

		assert.Equal(t, 1, int(detailedCardPoints.SilverCardPoints))
		assert.Equal(t, 6, int(detailedCardPoints.GoldCardPoints))
	})
}
