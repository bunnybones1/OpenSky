//go:build integration

package data_test

import (
	"math/big"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestCrystalGetter(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestCrystalGetter")
			require.NoError(t, err)
		}
	}

	getter := data.NewCrystalGetter()

	t.Run("gets top priority crystal", func(t *testing.T) {

		t.Run("no crystal when none is owned", func(t *testing.T) {
			crystals, err := getter.GetTopPriority(data.DB.Session, []proto.AccountID{accountID})
			require.NoError(t, err)
			require.Empty(t, crystals)
		})

		t.Run("with correct priority", func(t *testing.T) {
			crystalItemIDByPriority := []uint64{7, 1, 2, 3, 8, 4, 5, 6}

			for i := len(crystalItemIDByPriority) - 1; i >= 0; i-- {
				crystalItemID := crystalItemIDByPriority[i]

				// Setup
				{
					// Items
					{
						tokenID := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_CRYSTALS, crystalItemID)
						err := data.DB.Items().GainToken(accountID, tokenID, big.NewInt(1), proto.TransactionType_GIVEAWAY, "")
						require.NoError(t, err)
					}
				}

				crystals, err := getter.GetTopPriority(data.DB.Session, []proto.AccountID{accountID})
				require.NoError(t, err)
				require.Len(t, crystals, 1)

				require.NotNil(t, crystals[accountID])
				assert.Equal(t, crystalItemID, crystals[accountID])
			}
		})
	})
}
