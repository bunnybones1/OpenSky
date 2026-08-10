package quests_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/quests"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestGetPeriod(t *testing.T) {
	nextDailyReset, nextWeeklyReset, nextSeasonalReset := getNextResets(data.TimeNowUTC())

	tests := []struct {
		periodicity proto.QuestPeriodicity
		nextReset   time.Time
	}{
		{
			periodicity: proto.QuestPeriodicity_DAILY,
			nextReset:   nextDailyReset,
		},
		{
			periodicity: proto.QuestPeriodicity_WEEKLY,
			nextReset:   nextWeeklyReset,
		},
		{
			periodicity: proto.QuestPeriodicity_SEASONAL,
			nextReset:   nextSeasonalReset,
		},
	}

	for _, tt := range tests {
		t.Run(tt.periodicity.String(), func(t *testing.T) {
			currentPeriod := quests.GetCurrentPeriod(tt.periodicity)
			nextPeriod := quests.GetPeriodInTime(tt.periodicity, tt.nextReset)

			assert.Equal(t, nextPeriod, currentPeriod+1)
		})
	}
}

func getNextResets(now time.Time) (nextDailyReset, nextWeeklyReset, nextSeasonalReset time.Time) {
	// daily
	{
		seasonStart := data.SeasonStartTime(1)

		nextDailyReset = time.Date(
			now.Year(),
			now.Month(),
			now.Day(),
			seasonStart.Hour(),
			seasonStart.Minute(),
			0,
			0,
			time.UTC,
		)

		if nextDailyReset.Before(now) {
			nextDailyReset = nextDailyReset.Add(24 * time.Hour)
		}
	}

	// weekly
	{
		season, week := data.SeasonWeekFromTimestamp(now)
		nextWeeklyReset = data.SeasonWeekStartTime(season, week)
		nextWeeklyReset = nextWeeklyReset.Add(7 * 24 * time.Hour)
	}

	// seasonal
	{
		nextSeasonalReset = data.SeasonStartTime(data.CurrentSeason() + 1)
	}

	return
}
