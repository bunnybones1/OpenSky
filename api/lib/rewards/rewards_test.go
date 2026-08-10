package rewards

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRewards(t *testing.T) {
	rewSilver := SilverRewards()
	rewTicket := TicketRewards()
	rewCnt := RewardedRanksCount()
	totalSilver := uint(0)
	totalTicket := uint(0)

	for i := uint(0); i < rewCnt; i++ {
		totalSilver += rewSilver[i+1]
		totalTicket += rewTicket[i+1]
	}

	// For each leaderboard
	assert.True(t, totalSilver == 250)
	assert.True(t, totalTicket == 350)
}
