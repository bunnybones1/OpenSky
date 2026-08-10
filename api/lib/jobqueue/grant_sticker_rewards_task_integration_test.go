//go:build integration

package jobqueue_test

import (
	"context"
	"encoding/json"
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestGrantStickerRewardsRunner(t *testing.T) {
	var accountID, invitedID1, invitedID2 proto.AccountID

	season := data.CurrentSeason()

	var task *data.Task

	var taskPayload jobqueue.GrantStickerRewardsTask

	var sticker1, sticker2, sticker3, sticker4 *data.Sticker

	var totalFriendPoints uint64

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestGrantStickerRewardsRunner")
			require.NoError(t, err)

			invitedID1 = createInvitedAccount(t, "TestGrantStickerRewardsRunner-invited-1", accountID)
			invitedID2 = createInvitedAccount(t, "TestGrantStickerRewardsRunner-invited-2", accountID)
		}

		// Levels per season
		{
			createLevelsPerSeason(t, invitedID1, accountID, season, 2, 3, 0)
			totalFriendPoints += 5

			createLevelsPerSeason(t, invitedID2, accountID, season, 15, 0, 5)
			totalFriendPoints += 15
		}

		// Sticker points
		{
			err := data.DB.Items().GainStickerPoints(accountID, big.NewInt(5+15-5), proto.TransactionType_SKYWEAVER, "")
			require.NoError(t, err)

			err = data.DB.Items().GainStickerPoints(accountID, big.NewInt(20), proto.TransactionType_SKYPASS, "")
			require.NoError(t, err)
		}

		// Task
		{
			taskPayload = jobqueue.GrantStickerRewardsTask{
				AccountID: accountID,
				Season:    season,
			}

			payloadJSON, err := json.Marshal(taskPayload)
			require.NoError(t, err)

			task = &data.Task{
				Task: &proto.Task{
					Status:  proto.TaskStatus_PENDING,
					Payload: payloadJSON,
				},
			}
		}

		// Stickers
		{
			sticker1 = &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 1,
				TokenID:        1,
				Season:         season,
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
		}
	}

	totalPoints, totalPointsSpent := getCurrentFriendPoints(t, accountID, season)
	assert.Equal(t, 5, int(totalPointsSpent))
	assert.Equal(t, totalFriendPoints, totalPoints)

	stickerPoints, err := data.DB.Items().GetStickerPoints(accountID)
	require.NoError(t, err)
	assert.Equal(t, 35, int(stickerPoints))

	mintingDelayMinutes := uint(60)
	cfg := config.OpenSkyStickerRewardsConfig{
		MintingDelayMinutes: mintingDelayMinutes,
	}

	runner := jobqueue.NewGrantStickerRewardsRunner(cfg)

	err = runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)

	resultTask, payload, err := apitest.GetTask[jobqueue.MintStickerRewardsTask](jobqueue.MintStickerRewardsQueue, &accountID)
	require.NoError(t, err)

	assert.WithinDuration(t, data.TimeNowUTC().Add(time.Duration(mintingDelayMinutes)*time.Minute), *resultTask.RunAt, 10*time.Minute)

	assert.Equal(t, accountID, payload.AccountID)
	require.Len(t, payload.StickerAmounts, 2)
	assert.Equal(t, 100, int(payload.StickerAmounts[sticker3.TokenID]))
	assert.Equal(t, 100, int(payload.StickerAmounts[sticker4.TokenID]))

	totalPoints, totalPointsSpent = getCurrentFriendPoints(t, accountID, season)
	assert.Equal(t, totalFriendPoints, totalPointsSpent)
	assert.Equal(t, totalFriendPoints, totalPoints)

	stickerPoints, err = data.DB.Items().GetStickerPoints(accountID)
	require.NoError(t, err)
	assert.Equal(t, 15, int(stickerPoints))
}

func getCurrentFriendPoints(t *testing.T, accountID proto.AccountID, season uint16) (totalPoints, totalPointsSpent uint64) {
	friends, err := data.DB.LevelsPerSeason().GetFriendsList(accountID, season)
	require.NoError(t, err)

	for _, friend := range friends {
		totalPoints += friend.Points
		totalPointsSpent += friend.PointsSpent
	}

	return
}
