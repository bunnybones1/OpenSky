package jobqueue

import (
	"crypto/sha1"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	MintLeaderboardRewardsQueue      = "mint-leaderboard-rewards"
	MintLeaderboardRewardsRetryDelay = 60
	MintLeaderboardRewardsMaxRetries = 2

	ConquestTicketV1ID = 16646145
)

// MintLeaderboardRewardsTask is used to mint silver card and ticket rewards.
type MintLeaderboardRewardsTask struct {
	AccountID                    proto.AccountID                 `json:"account_id"`
	AccountAddress               proto.Hash                      `json:"account_address"`
	Season                       uint16                          `json:"season"`
	Week                         uint8                           `json:"week"`
	SilverCardAmounts            map[uint64]uint64               `json:"silver_card_amounts"`
	TicketAmount                 uint64                          `json:"ticket_amount"`
	RankedConstructedRank        int                             `json:"ranked_constructed_rank"`
	RankedDiscoveryRank          int                             `json:"ranked_discovery_rank"`
	EarnedDiscoveryPlayerRanks   []*proto.NotificationEarnedRank `json:"earned_discovery_player_ranks"`
	EarnedConstructedPlayerRanks []*proto.NotificationEarnedRank `json:"earned_constructed_player_ranks"`
}

func (t MintLeaderboardRewardsTask) Hash() string {
	h := sha1.New()

	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	h.Write([]byte(fmt.Sprintf("%d", t.Season)))
	h.Write([]byte(fmt.Sprintf("%d", t.Week)))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
