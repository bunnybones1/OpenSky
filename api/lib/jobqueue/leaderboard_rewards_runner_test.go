//go:build integration

package jobqueue_test

import (
	"context"
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

func TestNextLeaderboardReward(t *testing.T) {
	cfg := config.OpenSkyLeaderboardRewardsConfig{
		Time:    time.Date(2022, time.January, 3, 14, 0, 0, 0, time.UTC),
		Weekday: 1,
	}

	runner := jobqueue.NewLeaderboardRewardsRunner(cfg)

	t.Run("next task and reset task are correct", func(t *testing.T) {
		samples := []struct {
			Time     time.Time // scheduled time of a task
			NextTime time.Time // next time a task should be scheduled

			Season         uint16 // the season Time belongs to
			NextTimeSeason uint16 // the season NextTime belongs to
			NextTimeWeek   uint8

			TaskTimeSeason uint16 // the season that is going to be used as parameter when the task runs at Time
		}{
			// Week run
			{
				Time:           time.Date(2022, time.January, 2, 13, 45, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 3, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 2,
				NextTimeWeek:   1,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 3, 0, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 10, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 2,
				NextTimeWeek:   2,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 4, 23, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 10, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 2,
				NextTimeWeek:   2,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 5, 17, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 10, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 2,
				NextTimeWeek:   2,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 6, 19, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 10, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 2,
				NextTimeWeek:   2,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 7, 18, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 10, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 2,
				NextTimeWeek:   2,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 8, 11, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 10, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 2,
				NextTimeWeek:   2,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 9, 23, 59, 59, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 10, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 2,
				NextTimeWeek:   2,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 10, 0, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 17, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 3,
				NextTimeWeek:   3,
				TaskTimeSeason: 2,
			},

			// Mid-season dates
			{
				Time:           time.Date(2022, time.January, 17, 0, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 24, 14, 0, 0, 0, time.UTC),
				Season:         3,
				NextTimeSeason: 3,
				NextTimeWeek:   4,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 17, 23, 59, 59, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 24, 14, 0, 0, 0, time.UTC),
				Season:         3,
				NextTimeSeason: 3,
				NextTimeWeek:   4,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 18, 0, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 24, 14, 0, 0, 0, time.UTC),
				Season:         3,
				NextTimeSeason: 3,
				NextTimeWeek:   4,
				TaskTimeSeason: 3,
			},
			{
				Time:           time.Date(2022, time.January, 18, 13, 45, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 24, 14, 0, 0, 0, time.UTC),
				Season:         3,
				NextTimeSeason: 3,
				NextTimeWeek:   4,
				TaskTimeSeason: 3,
			},
			{
				Time:           time.Date(2022, time.January, 3, 13, 45, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 10, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 2,
				NextTimeWeek:   2,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 10, 0, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 17, 14, 0, 0, 0, time.UTC),
				Season:         2,
				NextTimeSeason: 3,
				NextTimeWeek:   3,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 17, 0, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 24, 14, 0, 0, 0, time.UTC),
				Season:         3,
				NextTimeSeason: 3,
				NextTimeWeek:   4,
				TaskTimeSeason: 2,
			},
			{
				Time:           time.Date(2022, time.January, 24, 14, 0, 13, 0, time.UTC),
				NextTime:       time.Date(2022, time.January, 31, 14, 0, 0, 0, time.UTC),
				Season:         3,
				NextTimeSeason: 3,
				NextTimeWeek:   5,
				TaskTimeSeason: 3,
			},
			{
				Time:           time.Date(2022, time.January, 31, 0, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.February, 7, 14, 0, 0, 0, time.UTC),
				Season:         3,
				NextTimeSeason: 3,
				NextTimeWeek:   6,
				TaskTimeSeason: 3,
			},
			{
				Time:           time.Date(2022, time.February, 7, 0, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.February, 14, 14, 0, 0, 0, time.UTC),
				Season:         3,
				NextTimeSeason: 4,
				NextTimeWeek:   7,
				TaskTimeSeason: 3,
			},
			{
				Time:           time.Date(2022, time.February, 14, 0, 0, 0, 0, time.UTC),
				NextTime:       time.Date(2022, time.February, 21, 14, 0, 0, 0, time.UTC),
				Season:         4,
				NextTimeSeason: 4,
				NextTimeWeek:   8,
				TaskTimeSeason: 3,
			},
			{
				Time:           time.Date(2022, time.February, 14, 23, 59, 59, 0, time.UTC),
				NextTime:       time.Date(2022, time.February, 21, 14, 0, 0, 0, time.UTC),
				Season:         4,
				NextTimeSeason: 4,
				NextTimeWeek:   8,
				TaskTimeSeason: 3,
			},

			// End of the year
			{
				Time:           time.Date(2022, time.December, 18+7, 23, 59, 59, 0, time.UTC),
				NextTime:       time.Date(2022, time.December, 19+7, 14, 0, 0, 0, time.UTC),
				Season:         15,
				NextTimeSeason: 15,
				NextTimeWeek:   52,
				TaskTimeSeason: 15,
			},
			{
				Time:           time.Date(2022, time.December, 18+14, 23, 59, 59, 0, time.UTC),
				NextTime:       time.Date(2023, time.January, 2, 14, 0, 0, 0, time.UTC),
				Season:         15,
				NextTimeSeason: 15,
				NextTimeWeek:   1,
				TaskTimeSeason: 15,
			},
			{
				Time:           time.Date(2022, time.December, 18+21, 23, 59, 59, 0, time.UTC),
				NextTime:       time.Date(2023, time.January, 9, 14, 0, 0, 0, time.UTC),
				Season:         15,
				NextTimeSeason: 15,
				NextTimeWeek:   2,
				TaskTimeSeason: 15,
			},
			{
				Time:           time.Date(2022, time.December, 18+28, 23, 59, 59+1, 0, time.UTC),
				NextTime:       time.Date(2023, time.January, 16+7, 14, 0, 0, 0, time.UTC),
				Season:         16,
				NextTimeSeason: 16,
				NextTimeWeek:   4,
				TaskTimeSeason: 15,
			},
		}
		for _, sample := range samples {
			err := data.DB.Tasks().Truncate()
			require.NoError(t, err)

			ctx := context.Background()

			task := &data.Task{Task: &proto.Task{
				RunAt: &sample.Time,
			}}

			err = runner.RunTasks(ctx, data.DB.Session, []*data.Task{task})
			require.NoError(t, err)

			assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)

			newTask, newTaskPayload, err := apitest.GetTask[jobqueue.LeaderboardRewardsTask](jobqueue.LeaderboardRewardsWorkGroup, nil)
			require.NoError(t, err)

			assert.Equal(t, sample.NextTime, *newTask.RunAt)
			assert.Equal(t, sample.NextTimeSeason, newTaskPayload.Season)
			assert.Equal(t, sample.NextTimeWeek, newTaskPayload.Week, sample)

			if sample.Season > sample.TaskTimeSeason {
				_, resetTaskPayload, err := apitest.GetTask[jobqueue.RankPointsHardResetTask](jobqueue.RankPointsHardResetGroup, nil)
				require.NoError(t, err, sample)

				assert.Equal(t, sample.TaskTimeSeason, resetTaskPayload.Season, sample)
			} else {
				_, resetTaskPayload, err := apitest.GetTask[jobqueue.RankPointsSoftResetTask](jobqueue.RankPointsSoftResetGroup, nil)
				require.NoError(t, err, sample)

				assert.Equal(t, sample.TaskTimeSeason, resetTaskPayload.Season, sample)
			}
		}
	})

	t.Run("schedules rewards", func(t *testing.T) {
		var accountID proto.AccountID

		ganeModes := []proto.GameMode{
			proto.GameMode_RANKED_CONSTRUCTED,
			proto.GameMode_RANKED_DISCOVERY,
		}

		season := data.CurrentSeason() - 1

		// Setup
		{
			// Accounts
			{
				var err error
				accountID, _, err = apitest.CreateRandomAccount("TestNextLeaderboardReward")
				require.NoError(t, err)
			}

			// Account stats
			{
				score := int32(9999)

				for _, gameMode := range ganeModes {
					accountStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID, gameMode, season)
					require.NoError(t, err)

					accountStats.Score = &score

					err = data.DB.Save(accountStats)
					require.NoError(t, err)
				}
			}
		}

		ctx := context.Background()

		runAt := data.SeasonStartTime(season + 1)

		inputTask := &data.Task{Task: &proto.Task{
			RunAt: &runAt,
		}}

		err := runner.RunTasks(ctx, data.DB.Session, []*data.Task{inputTask})
		require.NoError(t, err)

		assert.Equal(t, proto.TaskStatus_COMPLETED, inputTask.Status)

		_, taskPayload, err := apitest.GetTask[jobqueue.MintLeaderboardRewardsTask](jobqueue.MintLeaderboardRewardsQueue, &accountID)
		require.NoError(t, err)

		assert.Equal(t, season, taskPayload.Season)
		assert.Equal(t, 4, int(taskPayload.Week))
		assert.Greater(t, len(taskPayload.SilverCardAmounts), 0)
		assert.Equal(t, 4, int(taskPayload.TicketAmount))
		assert.Equal(t, 1, int(taskPayload.RankedConstructedRank))
		assert.Equal(t, 1, int(taskPayload.RankedDiscoveryRank))

		conquestTicket, err := data.DB.Items().GetConquestTickets(accountID)
		require.NoError(t, err)
		assert.Equal(t, 4, int(conquestTicket))
	})
}
