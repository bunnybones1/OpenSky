package data

import (
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type Payment struct {
	*proto.Payment
}

func (p *Payment) Store(sess db.Session) db.Store {
	return DB.Payments(sess)
}

func (p *Payment) Fail(sess db.Session) error {
	p.Status = proto.PaymentStatusPtr(proto.PaymentStatus_FAILED)

	if err := sess.Save(p); err != nil {
		return fmt.Errorf("save: %w", err)
	}

	return nil
}

func (p *Payment) StoreLog(sess db.Session, logData interface{}) error {
	if p.Payment == nil || p.ID == 0 {
		return fmt.Errorf("payment does not have ID")
	}

	paymentLog, err := NewPaymentLog(p.ID, logData)
	if err != nil {
		return fmt.Errorf("instantiate payment log: %w", err)
	}

	if err := sess.Save(paymentLog); err != nil {
		return fmt.Errorf("save payment log: %w", err)
	}

	return nil
}

var (
	_ interface {
		db.Record
	} = &Payment{}
)

type PaymentsStore struct {
	db.Collection
}

var paymentProviderToTransactionTypeMap = map[proto.PaymentProvider]proto.TransactionType{
	proto.PaymentProvider_GOOGLE_PLAY:          proto.TransactionType_GOOGLE_PLAY,
	proto.PaymentProvider_APPLE_APP_STORE:      proto.TransactionType_APPLE_APP_STORE,
	proto.PaymentProvider_STRIPE:               proto.TransactionType_STRIPE,
	proto.PaymentProvider_SEQUENCE:             proto.TransactionType_POLYGON_CHAIN,
	proto.PaymentProvider_SAMSUNG_GALAXY_STORE: proto.TransactionType_SAMSUNG_GALAXY_STORE,
}

func PaymentProviderToTransactionType(provider proto.PaymentProvider) proto.TransactionType {
	return paymentProviderToTransactionTypeMap[provider]
}
