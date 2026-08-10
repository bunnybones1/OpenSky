//go:build integration

package data_test

import (
	"testing"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/stretchr/testify/assert"
)

// TestWeeklyGoldsAvailableForFuture tests if there are atleast 3 gold rewards for each week
// in the next 30 days
func TestWeeklyGoldsAvailableForFuture(t *testing.T) {

	rows, err := data.DB.WeeklyGolds(nil).Session().SQL().Query(
		`WITH reward_range AS (
			SELECT generate_series(
				  date_trunc('day', now()),
				  date_trunc('day', now() + interval '30 days'),
				  interval '1 hour'
			  ) as hour	
		  )
		  SELECT reward_range.hour, count(weekly_golds.token_id) 
			  FROM weekly_golds
			  RIGHT JOIN reward_range
				  ON reward_range.hour >= weekly_golds.start_at
				  AND reward_range.hour <= weekly_golds.end_at
			  GROUP BY reward_range.hour
			  HAVING count(weekly_golds.token_id) < 2
			  ORDER BY reward_range.hour ASC`)

	assert.NoError(t, err)
	defer rows.Close()

	for rows.Next() {
		assert.FailNow(t, "there are not enough weekly golds available for the next 30 days")
	}

}
