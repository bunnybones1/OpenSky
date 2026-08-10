package payments

import (
	"errors"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func initiatePayment(sess db.Session, accountID proto.AccountID, provider proto.PaymentProvider, transactionID string) (*data.Payment, error) {
	var payment *data.Payment

	err := data.DB.Payments(sess).Find(db.Cond{
		"account_id":      accountID,
		"provider":        provider,
		"external_txn_id": transactionID,
	}).One(&payment)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find payment: %w", err)
	}

	if payment == nil {
		payment = &data.Payment{
			Payment: &proto.Payment{
				AccountID:     accountID,
				Status:        proto.PaymentStatusPtr(proto.PaymentStatus_INITIATED),
				Provider:      &provider,
				ExternalTxnID: transactionID,
			},
		}

		if err := sess.Save(payment); err != nil {
			return nil, fmt.Errorf("save initiated payment: %w", err)
		}
	}

	return payment, nil
}
