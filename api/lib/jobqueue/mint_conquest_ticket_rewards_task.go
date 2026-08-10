package jobqueue

import (
	"crypto/sha1"
	"fmt"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	MintTicketRewardsQueue      = "mint-ticket-rewards"
	MintTicketRewardsRetryDelay = 300
	MintTicketRewardsMaxRetries = 2

	ConquestTicketDecimalsMultiplier = 100
)

// MintTicketRewardsTask is used to mint conquest ticket rewards.
type MintTicketRewardsTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	TicketAmount   uint64          `json:"ticket_amount"`

	// added for more data in hash
	AwardedAt time.Time `json:"awarded_at"`
}

func (t MintTicketRewardsTask) Hash() string {
	ticketAmount := fmt.Sprintf("%d:%d", ConquestTicketV1ID, t.TicketAmount)

	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	h.Write([]byte(ticketAmount))
	h.Write([]byte(t.AwardedAt.String()))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
