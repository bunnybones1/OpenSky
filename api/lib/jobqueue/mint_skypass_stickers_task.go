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
	MintSkypassStickersQueue   = "mint-skypass-stickers"
	MintSkypassStickersDelay   = 60
	MintSkypassStickersRetries = 2
)

// MintSkypassStickersTask is used to mint stickers from claimed rewards.
type MintSkypassStickersTask struct {
	AccountID      proto.AccountID   `json:"account_id"`
	AccountAddress proto.Hash        `json:"account_address"`
	StickerAmounts map[uint64]uint64 `json:"sticker_amounts"`

	SkypassRewardID uint64 `json:"skypass_reward_id"`

	// added for more data in hash
	AwardedAt time.Time `json:"awarded_at"`
}

func (t MintSkypassStickersTask) Hash() string {
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
	h.Write([]byte(strconv.Itoa(int(t.SkypassRewardID))))
	h.Write([]byte(t.AwardedAt.String()))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
