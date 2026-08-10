package data

import (
	"encoding/json"
	"fmt"
	"reflect"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type PaymentLog struct {
	*proto.PaymentLog
}

func (p *PaymentLog) Store(sess db.Session) db.Store {
	return DB.PaymentsLogs(sess)
}

func NewPaymentLog(paymentID uint64, dataObject any) (*PaymentLog, error) {
	b, err := json.Marshal(dataObject)
	if err != nil {
		return nil, fmt.Errorf("encode data object: %w", err)
	}

	return &PaymentLog{
		PaymentLog: &proto.PaymentLog{
			PaymentID: paymentID,
			Data: &proto.PaymentLogData{
				Type: reflect.TypeOf(dataObject).String(),
				Data: b,
			},
		},
	}, nil
}

var (
	_ interface {
		db.Record
	} = &PaymentLog{}
)

type PaymentsLogsStore struct {
	db.Collection
}
