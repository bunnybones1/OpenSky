package jobqueue

import (
	"crypto/sha1"
	"fmt"
	"sort"
	"strconv"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	MintCardBackRewardsQueue      = "mint-card-back-rewards"
	MintCardBackRewardsRetryDelay = 60
	MintCardBackRewardsMaxRetries = 2

	CardBackDecimalsMultiplier = 100
)

// MintCardBackRewardsTask is used to mint card back rewards.
type MintCardBackRewardsTask struct {
	AccountID       proto.AccountID   `json:"account_id"`
	AccountAddress  proto.Hash        `json:"account_address"`
	CardBackAmounts map[uint64]uint64 `json:"card_back_amounts"`

	SkypassRewardID uint64 `json:"skypass_reward_id"`

	// added for more data in hash
	AwardedAt time.Time `json:"awarded_at"`
}

func (t MintCardBackRewardsTask) Hash() string {
	var cardBackAmounts []string
	for cardBackID, amount := range t.CardBackAmounts {
		cardBackAmounts = append(cardBackAmounts, fmt.Sprintf("%d:%d", cardBackID, amount))
	}
	// maps have no order guarantee, arrays do
	sort.Strings(cardBackAmounts)

	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	for _, amount := range cardBackAmounts {
		h.Write([]byte(amount))
	}
	h.Write([]byte(strconv.Itoa(int(t.SkypassRewardID))))
	h.Write([]byte(t.AwardedAt.String()))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
