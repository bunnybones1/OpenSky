package payments

import (
	"errors"
	"fmt"
	"math/big"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type ItemGainerImpl struct {
}

func NewItemGainer() *ItemGainerImpl {
	return &ItemGainerImpl{}
}

func (g *ItemGainerImpl) Gain(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) error {
	itemType, _, err := data.SWTokenID2TypeAndItemID(tokenID)
	if err != nil {
		return fmt.Errorf("convert item type from token ID: %w", err)
	}

	switch itemType {
	case proto.ItemType_SW_CONQUEST_TICKET:
		return g.gainConquestTicket(sess, payment, tokenID, amount)
	case proto.ItemType_SW_SKYPASS:
		return g.gainSkypass(sess, payment, tokenID, amount)
	default:
		return fmt.Errorf("unsupported item type %q", itemType)
	}
}

func (g *ItemGainerImpl) gainConquestTicket(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) error {
	if tokenID != data.ConquestTicketTokenID {
		return fmt.Errorf("invalid token for conquest ticket, token ID: %d", tokenID)
	}

	transactionType := data.PaymentProviderToTransactionType(*payment.Provider)

	err := data.DB.Items(sess).GainConquestTickets(payment.AccountID, big.NewInt(amount), transactionType, payment.ExternalTxnID)
	if err != nil {
		return fmt.Errorf("gain conquest tickets: %w", err)
	}

	return nil
}

func (g *ItemGainerImpl) gainSkypass(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) error {
	transactionType := data.PaymentProviderToTransactionType(*payment.Provider)

	itemType, itemID, err := data.SWTokenID2TypeAndItemID(tokenID)
	if err != nil {
		return fmt.Errorf("convert item ID from token ID: %w", err)
	}

	if itemID != uint64(data.CurrentSeason()) {
		return fmt.Errorf("invalid season for skypass, season: %d", itemID)
	}

	item, err := data.DB.Items(sess).FindAccountItem(payment.AccountID, itemType, itemID)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return fmt.Errorf("find item: %w", err)
	}

	if item == nil || item.Balance.Int64() == 0 {
		err := data.DB.Items(sess).GainToken(
			payment.AccountID,
			tokenID,
			big.NewInt(amount),
			transactionType,
			payment.ExternalTxnID,
		)
		if err != nil {
			return fmt.Errorf("gain token: %w", err)
		}
	}

	if err := data.DB.SkypassSeasonStats(sess).SetPremium(payment.AccountID, uint16(itemID)); err != nil {
		return fmt.Errorf("set skypass premium: %w", err)
	}

	return nil
}
