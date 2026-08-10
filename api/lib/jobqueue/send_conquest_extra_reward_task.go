package jobqueue

import (
	"crypto/sha1"
	"fmt"
	"sort"

	"github.com/horizon-games/OpenSky/api/proto"
)

// ConquestExtraReward task is a task where server sends an asset it owns to recipient
// as an extra reward

const (
	SendConquestExtraRewardQueue      = "conquest-extra-reward"
	SendConquestExtraRewardRetryDelay = 120 // in seconds
	SendConquestExtraRewardMaxRetries = 2
)

type SendConquestExtraRewardTask struct {
	ConquestID     int64           `json:"conquest_id"`
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	Nonce          uint64          `json:"nonce,omitempty"`

	// Rewards
	Assets map[uint64]uint64 `json:"assets"`
}

func (t SendConquestExtraRewardTask) Hash() string {
	var amounts []string
	for id, amount := range t.Assets {
		amounts = append(amounts, fmt.Sprintf("%d:%d", id, amount))
	}
	// maps have no order guarantee, arrays do
	sort.Strings(amounts)
	content := append(amounts, fmt.Sprintf("%d:%d:%d", t.ConquestID, t.AccountID, t.Nonce))

	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	for _, amount := range content {
		h.Write([]byte(amount))
	}
	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
