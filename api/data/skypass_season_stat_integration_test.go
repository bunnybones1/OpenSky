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

func TestSkypassSeasonStat(t *testing.T) {
	t.Run("level progress", func(t *testing.T) {
		stat := data.SkypassSeasonStat{
			InitialAccountLevel:  3,
			AchievedAccountLevel: 5,
		}

		assert.Equal(t, 2, int(stat.LevelProgress()))
	})
}

func TestSkypassSeasonStatsStore(t *testing.T) {
	var accountID proto.AccountID

	var account *data.Account

	// Setup
	{
		// Account
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestSkypassSeasonStatsStore")
			require.NoError(t, err)

			account, err = data.DB.Accounts().FindByID(accountID)
			require.NoError(t, err)
			require.NotNil(t, account)

			account.Level = 10

			err = data.DB.Save(account)
			require.NoError(t, err)
		}
	}

	t.Run("find or create", func(t *testing.T) {
		t.Run("finds when exists", func(t *testing.T) {
			var stat *data.SkypassSeasonStat

			season := uint16(2)

			// Setup
			{
				// Skypass season stats
				{
					stat = &data.SkypassSeasonStat{
						AccountID:            accountID,
						Season:               season,
						InitialAccountLevel:  5,
						AchievedAccountLevel: 8,
					}

					err := data.DB.Save(stat)
					require.NoError(t, err)
				}
			}

			result, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)

			require.NotNil(t, stat)
			assert.Equal(t, stat, result)
		})

		t.Run("creates with current level when does not exist and the target season is current", func(t *testing.T) {
			season := data.CurrentSeason()

			stat, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)

			require.NotNil(t, stat)
			assert.Equal(t, accountID, stat.AccountID)
			assert.Equal(t, season, stat.Season)
			assert.Equal(t, account.Level, stat.InitialAccountLevel)
			assert.Equal(t, account.Level, stat.AchievedAccountLevel)
			assert.False(t, stat.HasPremium)
			assert.False(t, stat.AutoClaimed)
		})

		t.Run("creates with zero level when does not exist and the target season is not current", func(t *testing.T) {
			season := data.CurrentSeason() - 1

			stat, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)

			require.NotNil(t, stat)
			assert.Equal(t, accountID, stat.AccountID)
			assert.Equal(t, season, stat.Season)
			assert.Zero(t, stat.InitialAccountLevel)
			assert.Zero(t, stat.AchievedAccountLevel)
			assert.False(t, stat.HasPremium)
			assert.False(t, stat.AutoClaimed)
		})
	})

	t.Run("set premium", func(t *testing.T) {
		var accountID proto.AccountID

		// Setup
		{
			// Accounts
			{
				var err error
				accountID, _, err = apitest.CreateRandomAccount("TestSkypassSeasonStatsStore-set-premium")
				require.NoError(t, err)
			}
		}

		t.Run("sets premium when no skypass season stat exists yet", func(t *testing.T) {
			season := uint16(1)

			stats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)
			assert.False(t, stats.HasPremium)

			err = data.DB.SkypassSeasonStats().SetPremium(accountID, season)
			require.NoError(t, err)

			stats, err = data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)

			assert.True(t, stats.HasPremium)
		})

		t.Run("sets premium when skypass season stat already exists", func(t *testing.T) {
			season := uint16(2)

			// Setup
			{
				stats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
				require.NoError(t, err)

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}

			stats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)
			assert.False(t, stats.HasPremium)

			err = data.DB.SkypassSeasonStats().SetPremium(accountID, season)
			require.NoError(t, err)

			stats, err = data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)

			assert.True(t, stats.HasPremium)
		})
	})

	t.Run("unset premium", func(t *testing.T) {
		// Setup
		{
			// Accounts
			{
				var err error
				accountID, _, err = apitest.CreateRandomAccount("TestSkypassSeasonStatsStore-unset-premium")
				require.NoError(t, err)
			}
		}

		t.Run("unsets premium when skypass season stat already exists", func(t *testing.T) {
			season := uint16(2)

			// Setup
			{
				stats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
				require.NoError(t, err)

				stats.HasPremium = true

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}

			stats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)
			assert.True(t, stats.HasPremium)

			err = data.DB.SkypassSeasonStats().UnsetPremium(accountID, season)
			require.NoError(t, err)

			stats, err = data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)

			assert.False(t, stats.HasPremium)
		})
	})

	t.Run("update progress", func(t *testing.T) {
		var accountID proto.AccountID

		// Setup
		{
			// Accounts
			{
				var err error
				accountID, _, err = apitest.CreateRandomAccount("TestSkypassSeasonStatsStore-progress")
				require.NoError(t, err)
			}
		}

		t.Run("updates progress when no skypass season stat exists yet", func(t *testing.T) {
			season := uint16(1)
			expectedLevel := uint16(10)

			stats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)
			assert.Zero(t, stats.InitialAccountLevel)

			err = data.DB.SkypassSeasonStats().UpdateProgress(accountID, season, expectedLevel)
			require.NoError(t, err)

			stats, err = data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)

			assert.Equal(t, expectedLevel, stats.AchievedAccountLevel)
			assert.Equal(t, expectedLevel, stats.LevelProgress())
		})

		t.Run("updates progress when skypass season stat already exists", func(t *testing.T) {
			season := uint16(2)
			achievedLevelBefore := uint16(2)
			expectedLevel := uint16(10)

			// Setup
			{
				stats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
				require.NoError(t, err)

				stats.AchievedAccountLevel = achievedLevelBefore

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}

			stats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)
			assert.Zero(t, stats.InitialAccountLevel)
			assert.Equal(t, achievedLevelBefore, stats.AchievedAccountLevel)

			err = data.DB.SkypassSeasonStats().UpdateProgress(accountID, season, expectedLevel)
			require.NoError(t, err)

			stats, err = data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, stats)

			assert.Equal(t, expectedLevel, stats.AchievedAccountLevel)
			assert.Equal(t, expectedLevel, stats.LevelProgress())
		})
	})
}
