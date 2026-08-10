//go:build integration

package rpc_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestGetGameModesStatus(t *testing.T) {
	ctx := apitest.DBContext(context.Background())

	t.Run("shows enabled as default if no status record exists", func(t *testing.T) {
		status, err := apitest.Client().GetGameModesStatus(ctx)
		require.NoError(t, err)

		assert.NotNil(t, status)
		assert.True(t, status.Tutorial)
		assert.True(t, status.PracticePVP)
		assert.True(t, status.PracticeBot)
		assert.True(t, status.WarmUp)
		assert.True(t, status.RankedConstructed)
		assert.True(t, status.RankedDiscovery)
		assert.True(t, status.ConquestConstructed)
		assert.True(t, status.ConquestDiscovery)
		assert.True(t, status.ChallengeConstructed)
		assert.True(t, status.ChallengeDiscovery)
	})

	t.Run("shows changed values", func(t *testing.T) {
		// Setup
		{
			modes := []proto.GameMode{
				proto.GameMode_TUTORIAL,
				proto.GameMode_PRACTICE_BOT,
				proto.GameMode_PRACTICE_PVP,
				proto.GameMode_WARM_UP,
				proto.GameMode_RANKED_CONSTRUCTED,
				proto.GameMode_RANKED_DISCOVERY,
				proto.GameMode_CONQUEST_CONSTRUCTED,
				proto.GameMode_CONQUEST_DISCOVERY,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
				proto.GameMode_CHALLENGE_DISCOVERY,
			}

			for _, mode := range modes {
				status := data.GameModeStatus{
					GameModeStatus: &proto.GameModeStatus{
						GameMode: &mode,
						Enabled:  false,
					},
				}

				err := data.DB.Save(&status)
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.GameModeStatus(nil).Truncate()
				require.NoError(t, err)
			})
		}

		status, err := apitest.Client().GetGameModesStatus(ctx)
		require.NoError(t, err)

		assert.NotNil(t, status)
		assert.False(t, status.Tutorial)
		assert.False(t, status.PracticePVP)
		assert.False(t, status.PracticeBot)
		assert.False(t, status.WarmUp)
		assert.False(t, status.RankedConstructed)
		assert.False(t, status.RankedDiscovery)
		assert.False(t, status.ConquestConstructed)
		assert.False(t, status.ConquestDiscovery)
		assert.False(t, status.ChallengeConstructed)
		assert.False(t, status.ChallengeDiscovery)
	})
}

func TestGMGameModeSet(t *testing.T) {
	var adminAccountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error
			adminAccountID, err = apitest.CreateRandomAdminAccount("GMGameModeSet")
			require.NoError(t, err)
		}

		t.Cleanup(func() {
			err := data.DB.GameModeStatus(nil).Truncate()
			require.NoError(t, err)

			err = data.DB.GameModeStatusHistory(nil).Truncate()
			require.NoError(t, err)
		})
	}

	ctx := apitest.AccountContext(adminAccountID)

	mode := proto.GameMode_RANKED_CONSTRUCTED

	// Check tables are empty
	{
		count, err := data.DB.GameModeStatus(nil).Find().Count()
		require.NoError(t, err)
		assert.Zero(t, count)

		count, err = data.DB.GameModeStatusHistory(nil).Find().Count()
		require.NoError(t, err)
		assert.Zero(t, count)
	}

	status, err := data.DB.GameModeStatus(nil).GetStatus(mode)
	require.NoError(t, err)
	require.True(t, status)

	ok, err := apitest.Client().GMGameModeSet(ctx, &mode, false)
	require.NoError(t, err)
	assert.True(t, ok)

	status, err = data.DB.GameModeStatus(nil).GetStatus(mode)
	require.NoError(t, err)
	require.False(t, status)

	// Check tables have correct data
	{
		var gameModeStatus *data.GameModeStatus
		err = data.DB.GameModeStatus(nil).Find(db.Cond{"game_mode": mode}).One(&gameModeStatus)
		require.NoError(t, err)

		require.NotNil(t, gameModeStatus)
		assert.Equal(t, mode, *gameModeStatus.GameMode)
		assert.False(t, gameModeStatus.Enabled)

		var gameModeStatusHistory *data.GameModeStatusHistory
		err = data.DB.GameModeStatusHistory(nil).Find(db.Cond{"game_mode": mode}).One(&gameModeStatusHistory)
		require.NoError(t, err)

		require.NotNil(t, gameModeStatusHistory)
		assert.Equal(t, mode, *gameModeStatusHistory.GameMode)
		assert.False(t, gameModeStatusHistory.Enabled)
		assert.Equal(t, adminAccountID, gameModeStatusHistory.AccountID)
	}
}

func TestGMGameModeStatusHistory(t *testing.T) {
	var adminAccountID proto.AccountID

	modes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_CONQUEST_CONSTRUCTED,
	}

	// Setup
	{
		// Account
		{
			var err error
			adminAccountID, err = apitest.CreateRandomAdminAccount("GMGameModeStatusHistory")
			require.NoError(t, err)
		}

		// Game mode status history
		{
			for i := 0; i < 10; i++ {
				mode := modes[i%len(modes)]
				history := data.GameModeStatusHistory{
					GameModeStatusHistory: &proto.GameModeStatusHistory{
						AccountID: adminAccountID,
						GameMode:  &mode,
						Enabled:   true,
					},
				}

				err := data.DB.Save(&history)
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.GameModeStatusHistory(nil).Truncate()
				require.NoError(t, err)
			})
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	t.Run("all records", func(t *testing.T) {
		page, history, err := apitest.Client().GMGameModeStatusHistory(ctx, nil, nil)
		require.NoError(t, err)

		assert.Len(t, history, 10)
		assert.False(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)
	})

	t.Run("filtered by a game mode", func(t *testing.T) {
		_, history, err := apitest.Client().GMGameModeStatusHistory(ctx, nil, []*proto.GameMode{&modes[0]})
		require.NoError(t, err)

		assert.Len(t, history, 5)
	})

	t.Run("paginated", func(t *testing.T) {
		pageSize := uint32(2)
		page := &proto.Page{
			PageSize: &pageSize,
		}

		page, history, err := apitest.Client().GMGameModeStatusHistory(ctx, page, nil)
		require.NoError(t, err)

		assert.Len(t, history, 2)
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)
	})
}
