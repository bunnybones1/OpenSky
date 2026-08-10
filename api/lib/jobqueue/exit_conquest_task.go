package jobqueue

import (
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
)

// ExitConquest task is used when a user finishes/exists their conquest,
// and we then distribute / mint their rewards.

const (
	ExitConquestQueue      = "exit-conquest"
	ExitConquestRetryDelay = 30 // in seconds
	ExitConquestMaxRetries = 5
)

type ExitConquestTask struct {
	ConquestID     uint64          `json:"conquest_id"`
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	Nonce          uint64          `json:"nonce,omitempty"`

	// Rewards
	SilverCardIDs []uint64 `json:"silver_card_ids"`
	GoldCardIDs   []uint64 `json:"gold_card_ids"`
}

func (t ExitConquestTask) Hash() string {
	return fmt.Sprintf("%d:%d:%d", t.ConquestID, t.AccountID, t.Nonce)
}
