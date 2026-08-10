package jobqueue

import (
	"crypto/sha1"
	"fmt"
	"sort"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	MintStickerRewardsQueue      = "mint-sticker-rewards"
	MintStickerRewardsRetryDelay = 60
	MintStickerRewardsMaxRetries = 2

	StickerDecimalsMultiplier = 100
)

// MintStickerRewardsTask is used to mint sticker rewards.
type MintStickerRewardsTask struct {
	AccountID      proto.AccountID   `json:"account_id"`
	AccountAddress proto.Hash        `json:"account_address"`
	StickerAmounts map[uint64]uint64 `json:"sticker_amounts"`

	// added for more data in hash
	AwardedAt time.Time `json:"awarded_at"`
}

func (t MintStickerRewardsTask) Hash() string {
	var stickerAmounts []string
	for stickerID, amount := range t.StickerAmounts {
		stickerAmounts = append(stickerAmounts, fmt.Sprintf("%d:%d", stickerID, amount))
	}
	// maps have no order guarantee, arrays do
	sort.Strings(stickerAmounts)

	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	for _, amount := range stickerAmounts {
		h.Write([]byte(amount))
	}
	h.Write([]byte(t.AwardedAt.String()))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
