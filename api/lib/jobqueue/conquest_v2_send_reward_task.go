package jobqueue

import (
	"crypto/sha1"
	"fmt"
	"math/big"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	ConquestV2SendRewardQueue      = "conquest-v2-send-reward"
	ConquestV2SendRewardRetryDelay = 60
	ConquestV2SendRewardMaxRetries = 2
)

// ConquestV2SendRewardTask is used to send weekly treasure rewards for Conquest V2.
type ConquestV2SendRewardTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	Season         uint16          `json:"season"`
	Week           uint16          `json:"week"`
	TreasureLevel  uint16          `json:"treasure_level"`

	// Rewards
	AmountUSDC        *big.Int          `json:"amount_usdc"` // 10^6 = 1 USDC
	SilverCardAmounts map[uint64]uint64 `json:"silver_card_amounts"`

	// added for more data in hash
	AwardedAt time.Time `json:"awarded_at"`
}

func (t ConquestV2SendRewardTask) Hash() string {
	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	h.Write([]byte(fmt.Sprintf("%d", t.Season)))
	h.Write([]byte(fmt.Sprintf("%d", t.Week)))
	h.Write([]byte(fmt.Sprintf("%d", t.TreasureLevel)))
	h.Write([]byte(fmt.Sprintf("%g", t.AmountUSDC)))
	h.Write([]byte(fmt.Sprintf("%v", t.SilverCardAmounts)))
	h.Write([]byte(t.AwardedAt.String()))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
