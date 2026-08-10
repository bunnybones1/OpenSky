//go:build integration

package data_test

import (
	"context"
	"testing"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestHeroSkinFinder(t *testing.T) {
	var accountID proto.AccountID

	hero := proto.Hero_SAMYA

	// Setup
	{
		heroSkinID := uint64(1)

		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestHeroSkinFinder")
			require.NoError(t, err)
		}

		// Hero skin
		{
			err := data.DB.Save(&data.HeroSkin{
				ID:   heroSkinID,
				Hero: hero,
			})
			require.NoError(t, err)
		}

		// Item
		{
			err := data.DB.Save(&data.Item{
				Item: &proto.Item{
					AccountID: accountID,
					ItemType:  proto.ItemType_SW_HERO_SKINS,
					TokenID:   heroSkinID,
					Balance:   prototyp.NewBigInt(1),
				},
			})
			require.NoError(t, err)
		}
	}

	finder := data.NewHeroSkinFinder()

	t.Run("account has the hero skin", func(t *testing.T) {
		deck, err := data.NewDeckByCardIDs("deck", data.HeroDeckClass(hero), []uint64{1062})
		require.NoError(t, err)

		has, err := finder.HasFromDeckString(context.Background(), accountID, deck.DeckString)
		require.NoError(t, err)

		assert.True(t, has)
	})

	t.Run("account does not have the hero skin", func(t *testing.T) {
		deck, err := data.NewDeckByCardIDs("deck", data.HeroDeckClass(proto.Hero_ADA), []uint64{22})
		require.NoError(t, err)

		has, err := finder.HasFromDeckString(context.Background(), accountID, deck.DeckString)
		require.NoError(t, err)

		assert.False(t, has)
	})
}
