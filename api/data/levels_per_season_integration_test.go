//go:build integration

package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestLevelsPerSeason(t *testing.T) {
	var accountID, invitedID1, invitedID2, invitedID3, invitedID4 proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestLevelsPerSeason")
			require.NoError(t, err)

			invitedID1 = createInvitedAccount(t, "TestLevelsPerSeason-invited-1", accountID)
			invitedID2 = createInvitedAccount(t, "TestLevelsPerSeason-invited-2", accountID)
			invitedID3 = createInvitedAccount(t, "TestLevelsPerSeason-invited-3", accountID)
			invitedID4 = createInvitedAccount(t, "TestLevelsPerSeason-invited-4", accountID)
		}
	}

	season := data.CurrentSeason()

	t.Run("find by ID all aeasons", func(t *testing.T) {
		// Setup
		{
			// Levels per season
			{
				createLevelsPerSeason(t, invitedID1, accountID, season-1, 3, 0, 0)
				createLevelsPerSeason(t, invitedID1, accountID, season, 1, 1, 0)

				t.Cleanup(func() {
					err := data.DB.LevelsPerSeason().Truncate()
					require.NoError(t, err)
				})
			}
		}

		levelsPerSeasons, err := data.DB.LevelsPerSeason().FindByAccountIDAllSeasons(invitedID1)
		require.NoError(t, err)

		require.Len(t, levelsPerSeasons, 2)
		assert.Equal(t, season-1, levelsPerSeasons[0].Season)
		assert.Equal(t, 3, int(levelsPerSeasons[0].Levels))
		assert.Equal(t, season, levelsPerSeasons[1].Season)
		assert.Equal(t, 1, int(levelsPerSeasons[1].Levels))
	})

	t.Run("set levels", func(t *testing.T) {
		// Setup
		{
			// Levels per season
			{
				t.Cleanup(func() {
					err := data.DB.LevelsPerSeason().Truncate()
					require.NoError(t, err)
				})
			}
		}

		account, err := data.DB.Accounts().FindByID(invitedID1)
		require.NoError(t, err)

		err = data.DB.LevelsPerSeason().SetLevels(account, 3, season)
		require.NoError(t, err)

		var levelsPerSeason *data.LevelsPerSeason

		err = data.DB.LevelsPerSeason().Find(db.Cond{"account_id": invitedID1, "inviter_id": accountID}).One(&levelsPerSeason)
		require.NoError(t, err)

		assert.Equal(t, 3, int(levelsPerSeason.Levels))

		err = data.DB.LevelsPerSeason().SetLevels(account, 5, season)
		require.NoError(t, err)

		err = data.DB.LevelsPerSeason().Find(db.Cond{"account_id": invitedID1, "inviter_id": accountID}).One(&levelsPerSeason)
		require.NoError(t, err)

		assert.Equal(t, 8, int(levelsPerSeason.Levels))
	})

	t.Run("get friends list", func(t *testing.T) {
		// Setup
		{
			// Levels per season
			{
				createLevelsPerSeason(t, invitedID1, accountID, season-1, 12, 13, 11)
				createLevelsPerSeason(t, invitedID1, accountID, season, 2, 3, 1)

				t.Cleanup(func() {
					err := data.DB.LevelsPerSeason().Truncate()
					require.NoError(t, err)
				})
			}
		}

		friends, err := data.DB.LevelsPerSeason().GetFriendsList(accountID, season)
		require.NoError(t, err)

		account, err := data.DB.Accounts().FindByID(invitedID1)
		require.NoError(t, err)

		require.Len(t, friends, 4)
		friend := friends[0]
		assert.Equal(t, invitedID1, friend.Account.ID)
		assert.Equal(t, account.Name, friend.Account.Name)
		assert.Equal(t, account.Locale, friend.Account.Locale)
		assert.Equal(t, account.Level, friend.Account.Level)
		assert.Equal(t, account.Region, friend.Account.Region)
		assert.Equal(t, account.InvitedByID, friend.Account.InvitedByID)
		assert.Equal(t, account.TagArtID, friend.Account.TagArtID)
		assert.Equal(t, season, friend.Season)
		assert.Equal(t, 2, int(friend.Levels))
		assert.Equal(t, 1, int(friend.PointsSpent))
		assert.Equal(t, 5, int(friend.Points))
	})

	t.Run("carry points over to new season", func(t *testing.T) {
		// Setup
		{
			// Levels per season
			{
				// Total sum of levels + carried - spent must be between number of required
				// points of sticker 1 and sticker 2.
				createLevelsPerSeason(t, invitedID1, accountID, season-1, 2, 3, 0) // carries over
				createLevelsPerSeason(t, invitedID2, accountID, season-1, 3, 2, 0) // carries over
				createLevelsPerSeason(t, invitedID3, accountID, season-1, 0, 0, 0) // no points
				createLevelsPerSeason(t, invitedID4, accountID, season-1, 2, 2, 4) // spent are equal to points

				t.Cleanup(func() {
					err := data.DB.LevelsPerSeason().Truncate()
					require.NoError(t, err)
				})
			}
		}

		err := data.DB.LevelsPerSeason().CarryPointsOverToNewSeason(season)
		require.NoError(t, err)

		var levelsPerSeasons []*proto.LevelsPerSeason

		err = data.DB.LevelsPerSeason().Find(db.Cond{"inviter_id": accountID, "season": season}).All(&levelsPerSeasons)
		require.NoError(t, err)
		assert.Len(t, levelsPerSeasons, 2)

		for _, levelsPerSeason := range levelsPerSeasons {
			assert.Equal(t, 0, int(levelsPerSeason.Levels))
			assert.Equal(t, 5, int(levelsPerSeason.PointsCarried))
			assert.Equal(t, 0, int(levelsPerSeason.PointsSpent))
		}
	})
}

func createInvitedAccount(t *testing.T, name string, inviter proto.AccountID) proto.AccountID {
	accountID, _, err := apitest.CreateRandomAccount(name)
	require.NoError(t, err)

	account, err := data.DB.Accounts().FindByID(accountID)
	require.NoError(t, err)
	require.NotNil(t, account)

	account.InvitedByID = &inviter
	err = data.DB.Save(account)
	require.NoError(t, err)

	return accountID
}

func createLevelsPerSeason(t *testing.T, address, inviter proto.AccountID, season uint16, levels, carried, spent uint64) {
	_, err := data.DB.SQL().InsertInto("levels_per_season").Values(&proto.LevelsPerSeason{
		AccountID:     address,
		InviterID:     inviter,
		Season:        season,
		Levels:        levels,
		PointsCarried: carried,
		PointsSpent:   spent,
	}).Exec()
	require.NoError(t, err)
}
