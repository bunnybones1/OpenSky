package payments

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v74"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type IntentCreator struct {
	stripeIntentCreator StripeIntentCreator
}

func NewIntentCreator(stripeIntentCreator StripeIntentCreator) *IntentCreator {
	return &IntentCreator{
		stripeIntentCreator: stripeIntentCreator,
	}
}

func (c *IntentCreator) CreateStripeIntent(ctx context.Context, accountID proto.AccountID, productID string) (*proto.StripeCheckout, error) {
	provider := proto.PaymentProvider_STRIPE

	interimTransactionId := uuid.NewString()

	var checkoutSession *stripe.CheckoutSession

	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		payment, err := c.initiatePayment(sess, accountID, provider, interimTransactionId)
		if err != nil {
			return fmt.Errorf("initiate payment: %w", err)
		}

		request := IntentRequest{
			ProductID: productID,
		}

		if err := payment.StoreLog(sess, request); err != nil {
			return fmt.Errorf("log request: %w", err)
		}

		checkoutSession, err = c.stripeIntentCreator.CreateIntent(ctx, productID, 1)
		if err != nil {
			return fmt.Errorf("create Stripe intent: %w", err)
		}

		if err := payment.StoreLog(sess, checkoutSession); err != nil {
			return fmt.Errorf("log Stripe checkout session: %w", err)
		}

		if err := c.updatePayment(sess, payment, checkoutSession); err != nil {
			return fmt.Errorf("update payment: %w", err)
		}

		return nil
	}, nil)
	if err != nil {
		return nil, err
	}

	return &proto.StripeCheckout{
		URL: checkoutSession.URL,
	}, nil
}

func (c *IntentCreator) initiatePayment(sess db.Session, accountID proto.AccountID, provider proto.PaymentProvider, transactionID string) (*data.Payment, error) {
	payment, err := initiatePayment(sess, accountID, provider, transactionID)
	if err != nil {
		return nil, fmt.Errorf("initiate payment: %w", err)
	}

	if *payment.Status != proto.PaymentStatus_INITIATED {
		return nil, fmt.Errorf("payment cannot be initiated, it is %s", payment.Status)
	}

	return payment, nil
}

func (c *IntentCreator) updatePayment(sess db.Session, payment *data.Payment, checkoutSession *stripe.CheckoutSession) error {
	// We need to check whether the same payment has been successfully processed already.
	exists, err := data.DB.Payments(sess).Find(db.Cond{
		"provider":        payment.Provider,
		"external_txn_id": checkoutSession.ID,
	}).Exists()
	if err != nil {
		return fmt.Errorf("find payment by external transaction ID: %w", err)
	}

	if exists {
		return fmt.Errorf("payment already exists")
	}

	payment.Status = proto.PaymentStatusPtr(proto.PaymentStatus_PENDING)
	payment.ExternalTxnID = checkoutSession.ID

	if err := sess.Save(payment); err != nil {
		return fmt.Errorf("save pending payment: %w", err)
	}

	return nil
}

type IntentRequest struct {
	ProductID string `json:"product_id"`
}

// StripeIntentCreator is a Stripe client for payment intents.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/stripe_intent_creator.go -package mock . StripeIntentCreator
type StripeIntentCreator interface {
	CreateIntent(ctx context.Context, productID string, amount uint64) (*stripe.CheckoutSession, error)
}
