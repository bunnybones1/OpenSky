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
	MintSkypassSilverCardsQueue   = "mint-skypass-silver-cards"
	MintSkypassSilverCardsDelay   = 60
	MintSkypassSilverCardsRetries = 2
)

// MintSkypassSilverCardsTask is used to mint silver cards from claimed rewards.
type MintSkypassSilverCardsTask struct {
	AccountID      proto.AccountID   `json:"account_id"`
	AccountAddress proto.Hash        `json:"account_address"`
	CardAmounts    map[uint64]uint64 `json:"card_amounts"`

	SkypassRewardID uint64 `json:"skypass_reward_id"`

	// added for more data in hash
	AwardedAt time.Time `json:"awarded_at"`
}

func (t MintSkypassSilverCardsTask) Hash() string {
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
	h.Write([]byte(strconv.Itoa(int(t.SkypassRewardID))))
	h.Write([]byte(t.AwardedAt.String()))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
