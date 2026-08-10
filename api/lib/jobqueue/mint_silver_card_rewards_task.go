package jobqueue

import (
	"crypto/sha1"
	"fmt"
	"sort"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	MintSilverCardRewardsQueue      = "mint-silver-card-rewards"
	MintSilverCardRewardsRetryDelay = 60
	MintSilverCardRewardsMaxRetries = 2

	SilverCardDecimalsMultiplier = 100
)

// MintSilverCardRewardsTask is used to mint silver card rewards.
type MintSilverCardRewardsTask struct {
	AccountID      proto.AccountID   `json:"account_id"`
	AccountAddress proto.Hash        `json:"account_address"`
	CardAmounts    map[uint64]uint64 `json:"card_amounts"`

	// added for more data in hash
	AwardedAt time.Time `json:"awarded_at"`
}

func (t MintSilverCardRewardsTask) Hash() string {
	var cardAmounts []string
	for cardID, amount := range t.CardAmounts {
		cardAmounts = append(cardAmounts, fmt.Sprintf("%d:%d", cardID, amount))
	}
	// maps have no order guarantee, arrays do
	sort.Strings(cardAmounts)

	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	for _, amount := range cardAmounts {
		h.Write([]byte(amount))
	}
	h.Write([]byte(t.AwardedAt.String()))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
