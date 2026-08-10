package payments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/big"
	"reflect"
	"strconv"
	"strings"

	"github.com/stripe/stripe-go/v74"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	stripeEventTypeCheckoutSessionCompleted             = "checkout.session.completed"
	stripeEventTypeCheckoutSessionExpired               = "checkout.session.expired"
	stripeEventTypeCheckoutSessionAsyncPaymentSucceeded = "checkout.session.async_payment_succeeded"
	stripeEventTypeCheckoutSessionAsyncPaymentFailed    = "checkout.session.async_payment_failed"
)

var errPaymentAlreadySuccessful = fmt.Errorf("payment is already successful")

type EventHandler struct {
	stripeEventGetter StripeEventGetter
	productConverter  ProductConverter
	itemTokenGetter   ItemTokenGetter
	itemGainer        ItemGainer
	analyticsTracker  analytics.Tracker
	metricsCollector  MetricsCollector
}

func NewEventHandler(
	stripeEventGetter StripeEventGetter,
	productConverter ProductConverter,
	itemTokenGetter ItemTokenGetter,
	itemGainer ItemGainer,
	analyticsTracker analytics.Tracker,
	metricsCollector MetricsCollector,
) *EventHandler {
	return &EventHandler{
		stripeEventGetter: stripeEventGetter,
		productConverter:  productConverter,
		itemTokenGetter:   itemTokenGetter,
		itemGainer:        itemGainer,
		analyticsTracker:  analyticsTracker,
		metricsCollector:  metricsCollector,
	}
}

func (h *EventHandler) HandleStripeEvent(ctx context.Context, eventID string) error {
	if len(eventID) == 0 {
		return fmt.Errorf("event ID cannot be empty")
	}

	event, err := h.stripeEventGetter.GetEvent(ctx, eventID)
	if err != nil {
		return fmt.Errorf("get event: %w", err)
	}

	err = data.DB.TxContext(ctx, func(sess db.Session) error {
		payment, err := h.findStripePayment(sess, event)
		if err != nil {
			return fmt.Errorf("find payment: %w", err)
		}

		if *payment.Status == proto.PaymentStatus_SUCCEEDED {
			return nil
		}

		if err := payment.StoreLog(sess, event); err != nil {
			return fmt.Errorf("log event: %w", err)
		}

		switch event.Type {
		case stripeEventTypeCheckoutSessionCompleted, stripeEventTypeCheckoutSessionAsyncPaymentSucceeded:
			if err := h.completeStripePayment(ctx, sess, payment, event); err != nil {
				return fmt.Errorf("complete payment: %w", err)
			}
		case stripeEventTypeCheckoutSessionExpired, stripeEventTypeCheckoutSessionAsyncPaymentFailed:
			if err := payment.Fail(sess); err != nil {
				return fmt.Errorf("fail payment: %w", err)
			}
		}

		return nil
	}, nil)
	if err != nil {
		return fmt.Errorf("event ID: %s, %w", eventID, err)
	}

	return nil
}

func (h *EventHandler) HandleOnChainItemPurchaseEvent(
	ctx context.Context,
	txHash proto.Hash,
	transferEvent *contracts.ERC20TransferEvent,
	itemPurchaseEvent *contracts.PaymentProxyItemPurchaseEvent,
) error {
	if !txHash.IsValidTxnHash() {
		return fmt.Errorf("invalid tx hash: %s", txHash)
	}

	if transferEvent == nil {
		return fmt.Errorf("transfer event is nil")
	}

	if itemPurchaseEvent == nil {
		return fmt.Errorf("item purchase event is nil")
	}

	products, err := h.parseOnChainProducts(itemPurchaseEvent.ItemIDsPurchased, proto.ItemType_USDC)
	if err != nil {
		return fmt.Errorf("parse products: %w", err)
	}

	if err := h.validateOnChainTransferEvent(transferEvent, products); err != nil {
		return fmt.Errorf("validate event: %w", err)
	}

	err = data.DB.TxContext(ctx, func(sess db.Session) error {
		account, err := data.DB.Accounts(sess).FindByAddress(itemPurchaseEvent.Spender)
		if err != nil {
			return fmt.Errorf("find account: %w", err)
		}

		payment, err := h.findOnChainPayment(sess, txHash, account.ID, itemPurchaseEvent.Nonce.String())
		if err != nil {
			return fmt.Errorf("find payment: %w", err)
		}

		if payment == nil {
			payment, err = initiatePayment(sess, account.ID, proto.PaymentProvider_SEQUENCE, txHash.String())
			if err != nil {
				return fmt.Errorf("initiate payment: %w", err)
			}
		}

		// To overwrite nonce in case the payment would be fetched from DB.
		payment.ExternalTxnID = txHash.String()

		if err := payment.StoreLog(sess, OnChainEvent{
			TxHash:            txHash,
			TransferEvent:     transferEvent,
			ItemPurchaseEvent: itemPurchaseEvent,
		}); err != nil {
			return fmt.Errorf("log event: %w", err)
		}

		for _, product := range products {
			if err := h.itemGainer.Gain(sess, payment, product.tokenID, product.quantity); err != nil {
				return fmt.Errorf("gain item: %w", err)
			}

			priceFloat32, _ := product.price.Float32()

			analyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     account.ID,
				ProductID:     product.productID,
				Currency:      "usdc",
				PricePerUnit:  priceFloat32 / float32(product.quantity),
				Quantity:      uint32(product.quantity),
				TotalPrice:    priceFloat32,
				Platform:      "on-chain",
				TransactionID: payment.ExternalTxnID,
				Token:         product.productID[:strings.LastIndex(product.productID, "_")],
				ItemType:      product.itemType,
			}

			_ = h.analyticsTracker.TrackItemPurchase(nil, &analyticsItemPurchase)

			h.metricsCollector.TrackPayment(proto.PaymentProvider_SEQUENCE, proto.PaymentStatus_SUCCEEDED, product.productID, uint64(product.quantity), proto.ItemType_USDC)
		}

		if err = h.completePayment(sess, payment); err != nil {
			return fmt.Errorf("complete payment: %w", err)
		}

		return nil
	}, nil)
	if err != nil {
		if errors.Is(err, errPaymentAlreadySuccessful) {
			return nil
		}

		return fmt.Errorf("tx: %s, %w", txHash, err)
	}

	return nil
}

func (h *EventHandler) HandleOnChainItemBurnEvent(
	ctx context.Context,
	txHash proto.Hash,
	transferBatchEvent *contracts.ERC1155TransferBatchEvent,
	itemBurnEvent *contracts.PaymentProxyItemBurnEvent,
) error {
	if !txHash.IsValidTxnHash() {
		return fmt.Errorf("invalid tx hash: %s", txHash)
	}

	if transferBatchEvent == nil {
		return fmt.Errorf("transfer batch event is nil")
	}

	if itemBurnEvent == nil {
		return fmt.Errorf("item burn event is nil")
	}

	priceItemType, err := h.validateTransferredTokens(transferBatchEvent.IDs)
	if err != nil {
		return fmt.Errorf("validate transferred tokens: %w", err)
	}

	products, err := h.parseOnChainProducts(itemBurnEvent.ItemIDsPurchased, priceItemType)
	if err != nil {
		return fmt.Errorf("parse products: %w", err)
	}

	if err := h.validateOnChainTransferBatchEvent(transferBatchEvent, products); err != nil {
		return fmt.Errorf("validate event: %w", err)
	}

	err = data.DB.TxContext(ctx, func(sess db.Session) error {
		account, err := data.DB.Accounts(sess).FindByAddress(itemBurnEvent.Spender)
		if err != nil {
			return fmt.Errorf("find account: %w", err)
		}

		payment, err := h.findOnChainPayment(sess, txHash, account.ID, itemBurnEvent.Nonce.String())
		if err != nil {
			return fmt.Errorf("find payment: %w", err)
		}

		if payment == nil {
			payment, err = initiatePayment(sess, account.ID, proto.PaymentProvider_SEQUENCE, txHash.String())
			if err != nil {
				return fmt.Errorf("initiate payment: %w", err)
			}
		}

		// To overwrite nonce in case the payment would be fetched from DB.
		payment.ExternalTxnID = txHash.String()

		if err := payment.StoreLog(sess, OnChainEvent{
			TxHash:             txHash,
			TransferBatchEvent: transferBatchEvent,
			ItemBurnEvent:      itemBurnEvent,
		}); err != nil {
			return fmt.Errorf("log event: %w", err)
		}

		for _, product := range products {
			if err := h.itemGainer.Gain(sess, payment, product.tokenID, product.quantity); err != nil {
				return fmt.Errorf("gain item: %w", err)
			}

			priceFloat32, _ := product.price.Float32()

			analyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     account.ID,
				ProductID:     product.productID,
				Currency:      priceItemType.String(),
				PricePerUnit:  priceFloat32 / float32(product.quantity),
				Quantity:      uint32(product.quantity),
				TotalPrice:    priceFloat32,
				Platform:      "on-chain",
				TransactionID: payment.ExternalTxnID,
				Token:         product.productID[:strings.LastIndex(product.productID, "_")],
				ItemType:      product.itemType,
			}

			_ = h.analyticsTracker.TrackItemPurchase(nil, &analyticsItemPurchase)

			h.metricsCollector.TrackPayment(proto.PaymentProvider_SEQUENCE, proto.PaymentStatus_SUCCEEDED, product.productID, uint64(product.quantity), priceItemType)
		}

		if err = h.completePayment(sess, payment); err != nil {
			return fmt.Errorf("complete payment: %w", err)
		}

		return nil
	}, nil)
	if err != nil {
		if errors.Is(err, errPaymentAlreadySuccessful) {
			return nil
		}

		return fmt.Errorf("tx: %s, %w", txHash, err)
	}

	return nil
}

func (h *EventHandler) completeStripePayment(ctx context.Context, sess db.Session, payment *data.Payment, event *stripe.Event) error {
	intentRequest, err := h.findIntentRequest(payment)
	if err != nil {
		return fmt.Errorf("find intent request: %w", err)
	}

	itemType, tokenID, amount, err := h.getTokenIDAndAmount(*payment.Provider, intentRequest.ProductID)
	if err != nil {
		return fmt.Errorf("get item type and amount: %w", err)
	}

	if err := h.itemGainer.Gain(sess, payment, tokenID, amount); err != nil {
		return fmt.Errorf("gain item: %w", err)
	}

	if err := h.completePayment(sess, payment); err != nil {
		if errors.Is(err, errPaymentAlreadySuccessful) {
			return nil
		}

		return fmt.Errorf("complete payment: %w", err)
	}

	totalPrice, err := strconv.ParseFloat(event.GetObjectValue("amount_total"), 64)
	if err != nil {
		return fmt.Errorf("parse amount total: %w", err)
	}

	account, err := data.DB.Accounts(sess).FindByID(payment.AccountID)
	if err != nil {
		return fmt.Errorf("find account: %w", err)
	}

	analyticsItemPurchase := proto.AnalyticsItemPurchase{
		AccountID:     account.ID,
		ProductID:     intentRequest.ProductID,
		Currency:      event.GetObjectValue("currency"),
		PricePerUnit:  float32(totalPrice) / float32(amount),
		Quantity:      uint32(amount),
		TotalPrice:    float32(totalPrice),
		Platform:      "stripe",
		TransactionID: payment.ExternalTxnID,
		Token:         intentRequest.ProductID[:strings.LastIndex(intentRequest.ProductID, "_")],
		ItemType:      *itemType,
	}

	_ = h.analyticsTracker.TrackItemPurchase(nil, &analyticsItemPurchase)

	h.metricsCollector.TrackPayment(proto.PaymentProvider_STRIPE, proto.PaymentStatus_SUCCEEDED, intentRequest.ProductID, 1, proto.ItemType_USDC)

	return nil
}

func (h *EventHandler) findStripePayment(sess db.Session, event *stripe.Event) (*data.Payment, error) {
	transactionID := event.GetObjectValue("id")

	if len(transactionID) == 0 {
		return nil, fmt.Errorf("event does not contain checkout session ID")
	}

	var payment *data.Payment

	err := data.DB.Payments(sess).Find(db.Cond{
		"provider":        proto.PaymentProvider_STRIPE,
		"external_txn_id": transactionID,
	}).One(&payment)
	if err != nil {
		if errors.Is(err, db.ErrNoMoreRows) {
			return nil, fmt.Errorf("payment with the transaction ID does not exist: %s", transactionID)
		}

		return nil, fmt.Errorf("find payment: %w", err)
	}

	return payment, nil
}

func (h *EventHandler) findOnChainPayment(sess db.Session, txHash proto.Hash, accountID proto.AccountID, externalID string) (*data.Payment, error) {
	// If there is a payment with tx hash as external txn ID it is considered to be successful.
	exists, err := data.DB.Payments(sess).Find(db.Cond{
		"provider":        proto.PaymentProvider_SEQUENCE,
		"external_txn_id": txHash,
	}).Exists()
	if err != nil {
		return nil, fmt.Errorf("find payment by tx: %w", err)
	}

	if exists {
		return nil, errPaymentAlreadySuccessful
	}

	var payment *data.Payment

	err = data.DB.Payments(sess).Find(db.Cond{
		"account_id":      accountID,
		"provider":        proto.PaymentProvider_SEQUENCE,
		"external_txn_id": externalID,
	}).One(&payment)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find payment by nonce: %w", err)
	}

	return payment, nil
}

func (h *EventHandler) findIntentRequest(payment *data.Payment) (*IntentRequest, error) {
	var paymentLog *data.PaymentLog

	var intentRequest IntentRequest

	err := data.DB.PaymentsLogs().Find(db.And(
		db.Cond{"payment_id": payment.ID},
		db.Raw("data->>'type' = ?", reflect.TypeOf(intentRequest).String()),
	)).One(&paymentLog)
	if err != nil {
		if errors.Is(err, db.ErrNoMoreRows) {
			return nil, fmt.Errorf("intent request does not exist in payment logs")
		}

		return nil, fmt.Errorf("find payment log: %w", err)
	}

	if err = json.Unmarshal(paymentLog.Data.Data, &intentRequest); err != nil {
		return nil, fmt.Errorf("decode intent request: %w", err)
	}

	return &intentRequest, nil
}

func (h *EventHandler) getTokenIDAndAmount(provider proto.PaymentProvider, product string) (itemType *proto.ItemType, tokenID uint64, amount int64, err error) {
	itemType, err = h.productConverter.ToItemType(provider, product)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("convert product to item type: %w", err)
	}

	amount = h.productConverter.ToAmount(product)

	tokenID, err = h.itemTokenGetter.GetToken(*itemType)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("get token ID: %w", err)
	}

	return itemType, tokenID, amount, nil
}

func (h *EventHandler) completePayment(sess db.Session, payment *data.Payment) error {
	// We need to check whether the same payment has been successfully processed already.
	exists, err := data.DB.Payments(sess).Find(db.Cond{
		"status":          proto.PaymentStatus_SUCCEEDED,
		"provider":        payment.Provider,
		"external_txn_id": payment.ExternalTxnID,
	}).Exists()
	if err != nil {
		return fmt.Errorf("find successful payment by external transaction ID: %w", err)
	}

	if exists {
		return errPaymentAlreadySuccessful
	}

	payment.Status = proto.PaymentStatusPtr(proto.PaymentStatus_SUCCEEDED)

	if err := sess.Save(payment); err != nil {
		return fmt.Errorf("save successful payment: %w", err)
	}

	return nil
}

func (h *EventHandler) validateTransferredTokens(tokenIDs []*big.Int) (proto.ItemType, error) {
	var itemType proto.ItemType

	for _, tokenID := range tokenIDs {
		it, _, err := data.SWTokenID2TypeAndItemID(tokenID.Uint64())
		if err != nil {
			return proto.ItemType_UNKNOWN, fmt.Errorf("token ID to item type: %w", err)
		}

		if itemType == proto.ItemType_UNKNOWN {
			itemType = it
		}

		if itemType != it {
			return proto.ItemType_UNKNOWN, fmt.Errorf("transferred tokens cannot be mix type")
		}
	}

	return itemType, nil
}

func (h *EventHandler) parseOnChainProducts(tokenIDs []*big.Int, priceItemType proto.ItemType) ([]*onChainEventProduct, error) {
	provider := proto.PaymentProvider_SEQUENCE

	itemsQuantity := make(map[uint64]int64)

	for _, tokenID := range tokenIDs {
		itemsQuantity[tokenID.Uint64()] += 1
	}

	products := make([]*onChainEventProduct, 0)

	for tokenID, quantity := range itemsQuantity {
		itemType, _, err := data.SWTokenID2TypeAndItemID(tokenID)
		if err != nil {
			return nil, fmt.Errorf("convert token ID: %w", err)
		}

		productID, err := h.productConverter.ToProductID(provider, &itemType, 1)
		if err != nil {
			return nil, fmt.Errorf("convert to product ID: %w", err)
		}

		price, err := h.productConverter.ToPrice(provider, productID, priceItemType)
		if err != nil {
			return nil, fmt.Errorf("convert to price: %w", err)
		}

		productPrice := big.NewFloat(0).Copy(price)
		productPrice.Mul(productPrice, big.NewFloat(float64(quantity)))

		products = append(products, &onChainEventProduct{
			tokenID:   tokenID,
			quantity:  quantity,
			itemType:  itemType,
			productID: productID,
			price:     productPrice,
		})
	}

	return products, nil
}

func (h *EventHandler) validateOnChainTransferEvent(transferEvent *contracts.ERC20TransferEvent, products []*onChainEventProduct) error {
	if len(products) == 0 {
		return fmt.Errorf("there are no valid products")
	}

	totalPrice := big.NewFloat(0)

	for _, product := range products {
		totalPrice.Add(totalPrice, product.price)
	}

	if totalPrice.Sign() <= 0 {
		return fmt.Errorf("total price is not positive, total price: %s", totalPrice)
	}

	totalPriceValue, _ := totalPrice.Mul(totalPrice, big.NewFloat(math.Pow10(6))).Int(nil)

	if transferEvent.Value.Cmp(totalPriceValue) != 0 {
		return fmt.Errorf("price of products is not the same as the paid value, total price: %s, paid: %s", totalPriceValue, transferEvent.Value)
	}

	return nil
}

func (h *EventHandler) validateOnChainTransferBatchEvent(transferBatchEvent *contracts.ERC1155TransferBatchEvent, products []*onChainEventProduct) error {
	if len(products) == 0 {
		return fmt.Errorf("there are no valid products")
	}

	totalPrice := big.NewFloat(0)

	for _, product := range products {
		totalPrice.Add(totalPrice, product.price)
	}

	if totalPrice.Sign() <= 0 {
		return fmt.Errorf("total price is not positive, total price: %s", totalPrice)
	}

	totalPrice.Mul(totalPrice, big.NewFloat(math.Pow10(2)))

	totalPricePaid := big.NewFloat(0)

	for i := 0; i < len(transferBatchEvent.Amounts); i++ {
		totalPricePaid.Add(totalPricePaid, big.NewFloat(float64(transferBatchEvent.Amounts[i].Uint64())))
	}

	if totalPrice.Cmp(totalPricePaid) != 0 {
		return fmt.Errorf("price of products is not the same as the paid value, total price: %s, paid: %s", totalPrice.String(), totalPricePaid.String())
	}

	return nil
}

type OnChainEvent struct {
	TxHash             proto.Hash
	TransferEvent      *contracts.ERC20TransferEvent
	ItemPurchaseEvent  *contracts.PaymentProxyItemPurchaseEvent
	TransferBatchEvent *contracts.ERC1155TransferBatchEvent
	ItemBurnEvent      *contracts.PaymentProxyItemBurnEvent
}

type onChainEventProduct struct {
	tokenID   uint64
	quantity  int64
	itemType  proto.ItemType
	productID string
	price     *big.Float
}

// StripeEventGetter is a Stripe client for getting events.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/stripe_event_getter.go -package mock . StripeEventGetter
type StripeEventGetter interface {
	GetEvent(ctx context.Context, eventID string) (*stripe.Event, error)
}
