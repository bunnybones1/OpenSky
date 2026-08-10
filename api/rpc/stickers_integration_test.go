//go:build integration

package rpc_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestStickers(t *testing.T) {
	// Setup
	{
		// Stickers
		{
			stickers := []proto.Sticker{
				{
					TokenID:        1001,
					RequiredPoints: 25,
					Season:         2,
				},
				{
					TokenID:        1002,
					RequiredPoints: 50,
					Season:         2,
				},
				{
					TokenID:        1003,
					RequiredPoints: 150,
					Season:         2,
				},
				{
					TokenID:        1004,
					RequiredPoints: 200,
					Season:         2,
				},

				{
					TokenID:        1004,
					RequiredPoints: 25,
					Season:         3,
				},
				{
					TokenID:        1006,
					RequiredPoints: 50,
					Season:         3,
				},
				{
					TokenID:        1005,
					RequiredPoints: 150,
					Season:         3,
				},
				{
					TokenID:        1008,
					RequiredPoints: 200,
					Season:         3,
				},

				{
					TokenID:        1011,
					RequiredPoints: 25,
					Season:         4,
				},
				{
					TokenID:        1015,
					RequiredPoints: 50,
					Season:         4,
				},
				{
					TokenID:        1021,
					RequiredPoints: 150,
					Season:         4,
				},
				{
					TokenID:        1033,
					RequiredPoints: 200,
					Season:         4,
				},
			}

			// insert items
			for _, sticker := range stickers {
				err := data.DB.Save(&data.Sticker{&sticker})
				assert.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.Stickers().Truncate()
				require.NoError(t, err)
			})
		}
	}

	ctx := apitest.ServiceContext()

	stickers, err := apitest.Client().GetStickersBySeason(ctx, 3)
	assert.NoError(t, err)
	assert.NotZero(t, len(stickers))
	assert.Equal(t, 4, len(stickers))
}
