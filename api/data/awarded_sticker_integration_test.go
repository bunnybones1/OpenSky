//go:build integration

package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestAwardedStickersStore(t *testing.T) {
	var accountID proto.AccountID

	var sticker1, sticker2, sticker3, sticker4 *data.Sticker

	season := data.CurrentSeason()

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestAwardedStickersStore")
			require.NoError(t, err)
		}

		// Stickers
		{
			sticker1 = &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 1,
				TokenID:        1,
				Season:         season - 1,
			}}
			err := data.DB.Save(sticker1)
			require.NoError(t, err)

			sticker2 = &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 5,
				TokenID:        2,
				Season:         season,
			}}
			err = data.DB.Save(sticker2)
			require.NoError(t, err)

			sticker3 = &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 10,
				TokenID:        3,
				Season:         season,
			}}
			err = data.DB.Save(sticker3)
			require.NoError(t, err)

			sticker4 = &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 25,
				TokenID:        4,
				Season:         season,
			}}
			err = data.DB.Save(sticker4)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.Stickers().Truncate()
				require.NoError(t, err)
			})
		}
	}

	t.Run("find all unawarded stickers", func(t *testing.T) {
		// Setup
		{
			// Awarded stickers
			{
				awardedSticker1 := &data.AwardedSticker{
					AccountID: accountID,
					TokenID:   sticker1.TokenID,
					Season:    sticker1.Season,
				}
				err := data.DB.Save(awardedSticker1)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.AwardedStickers().Truncate()
					require.NoError(t, err)
				})
			}
		}

		stickers, err := data.DB.AwardedStickers().FindAllUnawardedStickers(accountID, season)
		require.NoError(t, err)

		assert.Len(t, stickers, 3)
		assert.Contains(t, stickers, sticker2)
		assert.Contains(t, stickers, sticker3)
		assert.Contains(t, stickers, sticker4)
	})

	t.Run("find highest cost awarded sticker", func(t *testing.T) {
		// Setup
		{
			// Awarded stickers
			{
				awardedSticker1 := &data.AwardedSticker{
					AccountID: accountID,
					TokenID:   sticker1.TokenID,
					Season:    sticker1.Season,
				}
				err := data.DB.Save(awardedSticker1)
				require.NoError(t, err)

				awardedSticker2 := &data.AwardedSticker{
					AccountID: accountID,
					TokenID:   sticker2.TokenID,
					Season:    sticker2.Season,
				}
				err = data.DB.Save(awardedSticker2)
				require.NoError(t, err)

				awardedSticker3 := &data.AwardedSticker{
					AccountID: accountID,
					TokenID:   sticker3.TokenID,
					Season:    sticker3.Season,
				}
				err = data.DB.Save(awardedSticker3)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.AwardedStickers().Truncate()
					require.NoError(t, err)
				})
			}
		}

		sticker, err := data.DB.AwardedStickers().FindHighestCostAwardedSticker(accountID, season)
		require.NoError(t, err)

		assert.Equal(t, sticker3, sticker)
	})
}
