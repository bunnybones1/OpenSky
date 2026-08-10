//go:build integration

package rpc_test

import (
	"fmt"
	"math/big"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestGetFriendPoints(t *testing.T) {
	var accountID, adminAccountID, invitedAccountID1, invitedAccountID2 proto.AccountID

	var address, anotherAddress, invitedAddress1, invitedAddress2 proto.Hash

	var sticker1, sticker2, sticker3 *data.Sticker

	season := data.CurrentSeason()

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestGetFriendPoints")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("TestGetFriendPoints-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGetFriendPoints-admin")
			require.NoError(t, err)

			invitedAccountID1, invitedAddress1 = createInvitedAccount(t, "TestGetFriendPoints-invited-1", accountID)
			invitedAccountID2, invitedAddress2 = createInvitedAccount(t, "TestGetFriendPoints-invited-2", accountID)
		}

		// Levels per season
		{
			createLevelsPerSeason(t, invitedAccountID1, accountID, season, 2, 3, 5)
			createLevelsPerSeason(t, invitedAccountID2, accountID, season, 12, 13, 15)
		}

		// Stickers
		{
			sticker1 = &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 10,
				TokenID:        1,
				Season:         season,
			}}
			err := data.DB.Save(sticker1)
			require.NoError(t, err)

			sticker2 = &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 20,
				TokenID:        2,
				Season:         season,
			}}
			err = data.DB.Save(sticker2)
			require.NoError(t, err)

			sticker3 = &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 30,
				TokenID:        3,
				Season:         season,
			}}
			err = data.DB.Save(sticker3)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.Stickers().Truncate()
				require.NoError(t, err)
			})
		}

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

			t.Cleanup(func() {
				err := data.DB.AwardedStickers().Truncate()
				require.NoError(t, err)
			})
		}

		// Items
		{
			err := data.DB.Items().GainStickerPoints(accountID, big.NewInt(100), proto.TransactionType_SKYWEAVER, "")
			require.NoError(t, err)
		}
	}

	expectedTotalSeasonPoints := uint64(100 + 5 + 15)

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		totalPoints, friendPoints, err := apitest.Client().GetFriendPoints(ctx, "")
		require.NoError(t, err)

		assert.Equal(t, int(expectedTotalSeasonPoints), int(totalPoints))

		require.Len(t, friendPoints, 2)
		assert.Equal(t, invitedAccountID2, friendPoints[0].Account.ID)
		assert.Equal(t, invitedAddress2, friendPoints[0].Account.Address)
		assert.Equal(t, 25, int(friendPoints[0].Points))
		assert.Equal(t, 15, int(friendPoints[0].PointsSpent))
		assert.Equal(t, invitedAccountID1, friendPoints[1].Account.ID)
		assert.Equal(t, invitedAddress1, friendPoints[1].Account.Address)
		assert.Equal(t, 5, int(friendPoints[1].Points))
		assert.Equal(t, 5, int(friendPoints[1].PointsSpent))
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		totalPoints, friendPoints, err := apitest.Client().GetFriendPoints(ctx, address.String())
		require.NoError(t, err)

		assert.Equal(t, int(expectedTotalSeasonPoints), int(totalPoints))
		assert.Len(t, friendPoints, 2)
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		totalPoints, friendPoints, err := apitest.Client().GetFriendPoints(ctx, anotherAddress.String())
		require.NoError(t, err)

		assert.Equal(t, int(expectedTotalSeasonPoints), int(totalPoints))
		assert.Len(t, friendPoints, 2)
	})
}

func TestGetPointsGifted(t *testing.T) {
	var accountID, adminAccountID, invitedAccountID proto.AccountID

	var anotherAddress, invitedAddress proto.Hash

	season := data.CurrentSeason()

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestGetPointsGifted")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("TestGetPointsGifted-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGetPointsGifted-admin")
			require.NoError(t, err)

			invitedAccountID, invitedAddress = createInvitedAccount(t, "TestGetPointsGifted-invited-1", accountID)
		}

		// Levels per season
		{
			createLevelsPerSeason(t, invitedAccountID, accountID, season-1, 11, 12, 13)
			createLevelsPerSeason(t, invitedAccountID, accountID, season, 21, 22, 23)
		}
	}

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(invitedAccountID)

		totalPoints, inviter, err := apitest.Client().GetPointsGifted(ctx, "")
		require.NoError(t, err)

		assert.Equal(t, 32, int(totalPoints))

		require.NotNil(t, inviter)
		assert.Equal(t, accountID, inviter.ID)
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		totalPoints, inviter, err := apitest.Client().GetPointsGifted(ctx, invitedAddress.String())
		require.NoError(t, err)

		assert.Equal(t, 32, int(totalPoints))

		require.NotNil(t, inviter)
		assert.Equal(t, accountID, inviter.ID)
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(invitedAccountID)

		totalPoints, inviter, err := apitest.Client().GetPointsGifted(ctx, anotherAddress.String())
		require.NoError(t, err)

		assert.Equal(t, 32, int(totalPoints))

		require.NotNil(t, inviter)
		assert.Equal(t, accountID, inviter.ID)
	})
}

func TestFriendsWithStatuses(t *testing.T) {
	var err error

	var inviterID proto.AccountID

	var inviterAddress proto.Hash

	accountStatuses := map[proto.Hash]proto.AccountStatus{}

	// Setup
	{
		// Account
		inviterID, inviterAddress, err = apitest.CreateRandomAccount("TestFriendsWithStatuses")
		require.NoError(t, err)

		// Create invited accounts with different statuses
		statuses := []proto.AccountStatus{
			proto.AccountStatus_ACTIVE,
			proto.AccountStatus_SUSPENDED,
			proto.AccountStatus_BANNED,
			proto.AccountStatus_VIP,
			proto.AccountStatus_FLAGGED,
			proto.AccountStatus_TO_DELETE,
			proto.AccountStatus_DELETED,
		}

		for i := 0; i < 10; i++ {
			status := statuses[i%len(statuses)]

			account := &proto.Account{
				Address:     proto.HashFromString(fmt.Sprintf("0x%0.40x", i)),
				Name:        fmt.Sprintf("account-%d", i),
				InvitedByID: &inviterID,
				Status:      status,
			}

			accountStatuses[account.Address] = status

			err := data.DB.Save(&data.Account{account})
			require.NoError(t, err)
		}

	}

	t.Run("retrieve friends with different statuses", func(t *testing.T) {
		ctx := apitest.AccountContext(inviterID)

		_, friends, err := apitest.Client().GetFriendPoints(ctx, inviterAddress.String())
		require.NoError(t, err)
		for _, friend := range friends {
			status := accountStatuses[friend.Account.Address]

			found := false
			for i := range data.ActiveStatuses {
				if data.ActiveStatuses[i] == status {
					found = true
				}
			}

			require.True(t, found, "expected account to have an \"active\" status")
		}
	})
}

func createInvitedAccount(t *testing.T, name string, inviterID proto.AccountID) (proto.AccountID, proto.Hash) {
	accountID, address, err := apitest.CreateRandomAccount(name)
	require.NoError(t, err)

	account, err := data.DB.Accounts().FindByID(accountID)
	require.NoError(t, err)
	require.NotNil(t, account)

	account.InvitedByID = &inviterID
	err = data.DB.Save(account)
	require.NoError(t, err)

	return accountID, address
}

func createLevelsPerSeason(t *testing.T, accountID, inviterID proto.AccountID, season uint16, levels, carried, spent uint64) {
	_, err := data.DB.SQL().InsertInto("levels_per_season").Values(&proto.LevelsPerSeason{
		AccountID:     accountID,
		InviterID:     inviterID,
		Season:        season,
		Levels:        levels,
		PointsCarried: carried,
		PointsSpent:   spent,
	}).Exec()
	require.NoError(t, err)
}
