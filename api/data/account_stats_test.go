package data

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestSeasonWeekFromTimestamp(t *testing.T) {
	firstSeasonStart := time.Date(2021, 11, 22, 14, 00, 0, 0, time.UTC)

	tests := []struct {
		name         string
		timestamp    time.Time
		expectedWeek int
	}{
		{
			name:         "first season start",
			timestamp:    firstSeasonStart,
			expectedWeek: 1,
		},
		{
			name:         "start of season",
			timestamp:    firstSeasonStart.AddDate(0, 0, 4*7),
			expectedWeek: 1,
		},
		{
			name:         "mid of season",
			timestamp:    firstSeasonStart.AddDate(0, 0, 5*7),
			expectedWeek: 2,
		},
		{
			name:         "end of season",
			timestamp:    firstSeasonStart.AddDate(0, 0, 7*7),
			expectedWeek: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, week := SeasonWeekFromTimestamp(tt.timestamp)
			assert.Equal(t, tt.expectedWeek, int(week))
		})
	}
}

func TestSeasonCalculationFunctions(t *testing.T) {
	{
		seasonStart := SeasonStartTime(1)

		assert.Equal(t, firstSeasonStart.Unix(), seasonStart.Unix())

		season, week := SeasonWeekFromTimestamp(seasonStart)
		assert.Equal(t, uint16(1), season)
		assert.Equal(t, uint8(1), week)
	}

	{
		seasonStart := SeasonStartTime(2)

		assert.Equal(t, firstSeasonStart.Unix()+SeasonInSeconds, seasonStart.Unix())

		season, week := SeasonWeekFromTimestamp(seasonStart)
		assert.Equal(t, uint16(2), season)
		assert.Equal(t, uint8(1), week)
	}

	{
		seasonStart := SeasonStartTime(5)

		assert.Equal(t, firstSeasonStart.Unix()+(4*SeasonInSeconds), seasonStart.Unix())

		season, week := SeasonWeekFromTimestamp(seasonStart)
		assert.Equal(t, uint16(5), season)
		assert.Equal(t, uint8(1), week)
	}

	{
		seasonStart := SeasonWeekStartTime(11, 1)

		season, week := SeasonWeekFromTimestamp(seasonStart)
		assert.Equal(t, uint16(11), season)
		assert.Equal(t, uint8(1), week)
	}

	{
		seasonStart := SeasonWeekStartTime(11, 2)

		season, week := SeasonWeekFromTimestamp(seasonStart)
		assert.Equal(t, uint16(11), season)
		assert.Equal(t, uint8(2), week)
	}

	{
		seasonStart := SeasonWeekStartTime(11, 1)

		season, week := SeasonWeekFromTimestamp(seasonStart)
		assert.Equal(t, uint16(11), season)
		assert.Equal(t, uint8(1), week)
	}

	{
		seasonStart := SeasonWeekStartTime(11, 4)

		season, week := SeasonWeekFromTimestamp(seasonStart)
		assert.Equal(t, uint16(11), season)
		assert.Equal(t, uint8(4), week)
	}

	{
		seasonStart := SeasonWeekStartTime(11, 5)

		season, week := SeasonWeekFromTimestamp(seasonStart)
		assert.Equal(t, uint16(12), season)
		assert.Equal(t, uint8(1), week)
	}

	{
		for i := uint16(1); i < 10; i++ {
			seasonStart := SeasonStartTime(i)

			assert.Equal(t,
				firstSeasonStart.Unix()+((int64(i)-1)*SeasonInSeconds),
				seasonStart.Unix(),
			)
			assert.Equal(t,
				i,
				SeasonFromTimestamp(seasonStart),
			)

			season, week := SeasonWeekFromTimestamp(seasonStart)
			assert.Equal(t, i, season)
			assert.Equal(t, uint8(1), week)

			{
				nextSeasonWeekStart := SeasonWeekStartTime(i+1, 1)
				assert.Equal(t,
					SeasonStartTime(i+1),
					nextSeasonWeekStart,
				)

				season, week := SeasonWeekFromTimestamp(nextSeasonWeekStart)

				assert.Equal(t, i+1, season)
				assert.Equal(t, uint8(1), week)
			}

			{
				nextSeasonWeekStart := SeasonWeekStartTime(i, 5)
				assert.Equal(t,
					SeasonStartTime(i+1),
					nextSeasonWeekStart,
				)

				season, week := SeasonWeekFromTimestamp(nextSeasonWeekStart)

				assert.Equal(t, i+1, season)
				assert.Equal(t, uint8(1), week)
			}

			{
				nextSeasonWeekStart := SeasonWeekStartTime(i, 9)
				assert.Equal(t,
					SeasonStartTime(i+2),
					nextSeasonWeekStart,
				)

				season, week := SeasonWeekFromTimestamp(nextSeasonWeekStart)

				assert.Equal(t, i+2, season)
				assert.Equal(t, uint8(1), week)
			}
		}
	}
}

func TestTimestamps(t *testing.T) {
	{
		season, week := SeasonWeekFromTimestamp(time.Date(2022, 11, 21, 13, 59, 59, 0, time.UTC))
		assert.Equal(t, uint16(13), season)
		assert.Equal(t, uint8(4), week)
	}
	{
		season, week := SeasonWeekFromTimestamp(time.Date(2022, 11, 21, 14, 0, 0, 0, time.UTC))
		assert.Equal(t, uint16(14), season)
		assert.Equal(t, uint8(1), week)
	}
	{
		season, week := SeasonWeekFromTimestamp(time.Date(2022, 11, 28, 14, 0, 0, 0, time.UTC))
		assert.Equal(t, uint16(14), season)
		assert.Equal(t, uint8(2), week)
	}
	{
		season, week := SeasonWeekFromTimestamp(time.Date(2022, 12, 5, 14, 0, 0, 0, time.UTC))
		assert.Equal(t, uint16(14), season)
		assert.Equal(t, uint8(3), week)
	}
	{
		season, week := SeasonWeekFromTimestamp(time.Date(2022, 12, 12, 14, 0, 0, 0, time.UTC))
		assert.Equal(t, uint16(14), season)
		assert.Equal(t, uint8(4), week)
	}
	{
		season, week := SeasonWeekFromTimestamp(time.Date(2022, 12, 19, 14, 0, 0, 0, time.UTC))
		assert.Equal(t, uint16(15), season)
		assert.Equal(t, uint8(1), week)
	}
}
