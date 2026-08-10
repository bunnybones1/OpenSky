package jobqueue

import (
	"crypto/sha1"
	"fmt"
	"math/big"
	"strconv"
	"strings"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	MintConquestEntriesQueue      = "mint-conquest-entries"
	MintConquestEntriesRetryDelay = 60
	MintConquestEntriesMaxRetries = 5
)

// MintConquestEntriesTask is used to mint a Conquest Entry for a user which bought the ticket.
//
// For other conquest entries, users interact with the Conquest contract
// directly to enter the conquest.
type MintConquestEntriesTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	Amounts        []*big.Int      `json:"amount"`
	PaymentID      uint64          `json:"payment_id"`
}

func (t MintConquestEntriesTask) Hash() string {
	h := sha1.New()

	var amounts []string

	for _, i := range t.Amounts {
		amounts = append(amounts, i.String())
	}

	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	h.Write([]byte(strings.Join(amounts, ",")))
	h.Write([]byte(strconv.Itoa(int(t.PaymentID))))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}
