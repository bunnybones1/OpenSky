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

func TestGetGamesPlayed(t *testing.T) {
	var accountID proto.AccountID
	var season uint16

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestGetGamesPlayed")
			require.NoError(t, err)

			season = data.CurrentSeason()
		}
	}

	t.Run("no games on season", func(t *testing.T) {
		{
			gamesPlayed, err := data.DB.AccountStats().GetGamesPlayed(accountID, season)
			assert.NoError(t, err)
			assert.Zero(t, gamesPlayed)
		}
		{
			gamesPlayed, err := data.DB.AccountStats().GetGamesPlayed(accountID, season+1)
			assert.NoError(t, err)
			assert.Zero(t, gamesPlayed)
		}
	})

	t.Run("get games on season", func(t *testing.T) {
		var discoveryGames, constructedGames uint32

		{
			// past season

			constructedStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID, proto.GameMode_RANKED_CONSTRUCTED, season-1)
			assert.NoError(t, err)
			assert.NotZero(t, constructedStats)

			constructedStats.WinCount = 8
			constructedStats.LossCount = 9
			constructedStats.TieCount = 4

			data.DB.Save(constructedStats)
		}

		{
			constructedStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID, proto.GameMode_RANKED_CONSTRUCTED, season)
			assert.NoError(t, err)
			assert.NotZero(t, constructedStats)

			constructedStats.WinCount = 11
			constructedStats.LossCount = 14
			constructedStats.TieCount = 3

			constructedGames = uint32(constructedStats.WinCount + constructedStats.LossCount + constructedStats.TieCount)

			data.DB.Save(constructedStats)
		}

		{
			discoveryStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID, proto.GameMode_RANKED_DISCOVERY, season)
			assert.NoError(t, err)
			assert.NotZero(t, discoveryStats)

			discoveryStats.WinCount = 17
			discoveryStats.LossCount = 6
			discoveryStats.TieCount = 3

			discoveryGames = uint32(discoveryStats.WinCount + discoveryStats.LossCount + discoveryStats.TieCount)

			data.DB.Save(discoveryStats)
		}

		{
			gamesPlayed, err := data.DB.AccountStats().GetGamesPlayed(accountID, season)
			assert.NoError(t, err)
			assert.Equal(t, constructedGames+discoveryGames, gamesPlayed)
		}
	})

}
