//go:build integration

package xp_test

import (
	"fmt"
	"math/big"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/lib/levels/xp"
	"github.com/horizon-games/OpenSky/api/lib/levels/xp/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestLeveller(t *testing.T) {
	var account *data.Account

	var promoter *mock.MockPromoter
	var analyticsTracker *analyticsMock.MockTracker

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			promoter = mock.NewMockPromoter(ctrl)
			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
		}
	}

	leveller := xp.NewLeveller(apitest.NewLogger(), analyticsTracker, promoter)

	t.Run("levels up when there is enough xp", func(t *testing.T) {
		var inviterID proto.AccountID

		xp := uint64(450)

		// Setup
		{
			// Accounts
			{
				accountID, _, err := apitest.CreateRandomAccount("TestLeveller-1")
				require.NoError(t, err)

				inviterID, _, err = apitest.CreateRandomAccount("TestLeveller-inviter")
				require.NoError(t, err)

				account, err = data.DB.Accounts().FindByID(accountID)
				require.NoError(t, err)

				account.InvitedByID = &inviterID

				err = data.DB.Save(account)
				require.NoError(t, err)
			}

			// XP
			{
				err := data.DB.Items().GainXP(account.ID, big.NewInt(int64(xp)), proto.TransactionType_SKYWEAVER, "")
				require.NoError(t, err)
			}
		}

		remainingXP := xp - 2*200

		originalLevel := int(account.Level)

		promoter.EXPECT().PromoteUnranked(data.DB.Session, account, remainingXP)

		analyticsTracker.EXPECT().TrackLevelUps(gomock.Any(), account.ID, uint16(0), uint16(2), uint32(0))

		events, rewards, err := leveller.LevelUp(data.DB.Session, account)
		require.NoError(t, err)

		require.Len(t, events, 2)
		require.Len(t, rewards, 0)
		for i, event := range events {
			assert.Equal(t, account.ID, event.AccountID)
			assert.Equal(t, proto.FeedEventType_LEVELUP, event.Type)
			assert.Equal(t, originalLevel+1+i, int(*event.Level))
		}

		assert.Equal(t, 2, int(account.Level))

		storedAccount, err := data.DB.Accounts().FindByID(account.ID)
		require.NoError(t, err)
		require.NotNil(t, storedAccount)
		assert.Equal(t, 2, int(storedAccount.Level))

		newXP, err := data.DB.Items().GetXP(account.ID)
		require.NoError(t, err)
		assert.Equal(t, remainingXP, newXP)

		skypassStats, err := data.DB.SkypassSeasonStats().FindOrCreate(account.ID, data.CurrentSeason())
		require.NoError(t, err)
		assert.Equal(t, 2, int(skypassStats.AchievedAccountLevel))
		assert.Equal(t, 2, int(skypassStats.LevelProgress()))

		levelsPerSeoson, err := data.DB.LevelsPerSeason().FindByAccountIDAllSeasons(account.ID)
		require.NoError(t, err)
		require.Len(t, levelsPerSeoson, 1)
		assert.Equal(t, 2, int(levelsPerSeoson[0].Levels))

		stickerPoints, err := data.DB.Items().GetStickerPoints(inviterID)
		require.NoError(t, err)
		assert.Equal(t, 2, int(stickerPoints))
	})

	t.Run("does not level up when there is not enough xp", func(t *testing.T) {
		xp := uint64(50)

		// Setup
		{
			// Accounts
			{
				accountID, _, err := apitest.CreateRandomAccount("TestLeveller-2")
				require.NoError(t, err)

				account, err = data.DB.Accounts().FindByID(accountID)
				require.NoError(t, err)
			}

			// XP
			{
				err := data.DB.Items().GainXP(account.ID, big.NewInt(int64(xp)), proto.TransactionType_SKYWEAVER, "")
				require.NoError(t, err)
			}
		}

		events, _, err := leveller.LevelUp(data.DB.Session, account)
		require.NoError(t, err)
		assert.Empty(t, events)

		newXP, err := data.DB.Items().GetXP(account.ID)
		require.NoError(t, err)
		assert.Equal(t, xp, newXP)
	})

	t.Run("fails when promoter fails", func(t *testing.T) {
		xp := uint64(250)

		// Setup
		{
			// Accounts
			{
				accountID, _, err := apitest.CreateRandomAccount("TestLeveller-3")
				require.NoError(t, err)

				account, err = data.DB.Accounts().FindByID(accountID)
				require.NoError(t, err)
			}

			// XP
			{
				err := data.DB.Items().GainXP(account.ID, big.NewInt(int64(xp)), proto.TransactionType_SKYWEAVER, "")
				require.NoError(t, err)
			}
		}

		remainingXP := xp - 200

		someError := fmt.Errorf("some error")

		promoter.EXPECT().PromoteUnranked(data.DB.Session, account, remainingXP).Return(nil, nil, someError)

		events, rewards, err := leveller.LevelUp(data.DB.Session, account)
		require.ErrorIs(t, err, someError)
		assert.Empty(t, events)
		assert.Empty(t, rewards)
	})

	t.Run("fails when account is nil", func(t *testing.T) {
		events, rewards, err := leveller.LevelUp(data.DB.Session, nil)
		require.ErrorContains(t, err, "account cannot be nil")
		assert.Empty(t, events)
		assert.Empty(t, rewards)
	})

	t.Run("receives a reward if PromoteUnranked emits one", func(t *testing.T) {
		xp := uint64(2999)

		{
			accountID, _, err := apitest.CreateRandomAccount("TestLeveller-4")
			require.NoError(t, err)

			account, err = data.DB.Accounts().FindByID(accountID)
			require.NoError(t, err)
		}

		{
			err := data.DB.Items().GainXP(account.ID, big.NewInt(int64(xp)), proto.TransactionType_SKYWEAVER, "")
			require.NoError(t, err)
		}

		promoter.EXPECT().PromoteUnranked(data.DB.Session, account, uint64(199)).Return(nil, nil, nil)
		analyticsTracker.EXPECT().TrackLevelUps(gomock.Any(), account.ID, uint16(0), uint16(14), uint32(0))

		{
			events, rewards, err := leveller.LevelUp(data.DB.Session, account)
			assert.NoError(t, err)
			assert.NotEmpty(t, events)
			assert.Empty(t, rewards)
		}

		{
			err := data.DB.Items().GainXP(account.ID, big.NewInt(1), proto.TransactionType_SKYWEAVER, "")
			require.NoError(t, err)
		}

		promoter.EXPECT().PromoteUnranked(data.DB.Session, account, uint64(0)).Return(nil, []*proto.Reward{{
			AccountID: account.ID,
			Type:      proto.RewardType_RANK,
		}}, nil)
		analyticsTracker.EXPECT().TrackLevelUps(gomock.Any(), account.ID, uint16(14), uint16(15), uint32(0))

		{
			events, rewards, err := leveller.LevelUp(data.DB.Session, account)
			assert.NoError(t, err)
			assert.NotEmpty(t, events)
			assert.NotEmpty(t, rewards)
		}
	})
}
