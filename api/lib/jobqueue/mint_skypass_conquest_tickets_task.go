package jobqueue

import (
	"crypto/sha1"
	"fmt"
	"strconv"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	MintSkypassConquestTicketsQueue   = "mint-skypass-conquest-tickets"
	MintSkypassConquestTicketsDelay   = 300
	MintSkypassConquestTicketsRetries = 2
)

// MintSkypassConquestTicketsTask is used to mint conquest tickets from claimed rewards.
type MintSkypassConquestTicketsTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	TicketAmount   uint64          `json:"ticket_amount"`

	SkypassRewardID uint64 `json:"skypass_reward_id"`

	// added for more data in hash
	AwardedAt time.Time `json:"awarded_at"`
}

func (t MintSkypassConquestTicketsTask) Hash() string {
	ticketAmount := fmt.Sprintf("%d:%d", ConquestTicketV1ID, t.TicketAmount)

	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	h.Write([]byte(ticketAmount))
	h.Write([]byte(strconv.Itoa(int(t.SkypassRewardID))))
	h.Write([]byte(t.AwardedAt.String()))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
