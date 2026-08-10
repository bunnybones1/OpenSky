package payments

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/upper/db/v4"
	"google.golang.org/api/androidpublisher/v3"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/lib/payments/appleappstore"
	"github.com/horizon-games/OpenSky/api/lib/payments/samsunggalaxystore"
	"github.com/horizon-games/OpenSky/api/proto"
)

// ProviderResponseVerifier verifies purchase responses sent from the mobile.
type ProviderResponseVerifier struct {
	googlePlayVerifier         GooglePlayVerifier
	appleAppStoreVerifier      AppleAppStoreVerifier
	samsungGalaxyStoreVerifier SamsungGalaxyStoreVerifier
	productConverter           ProductConverter
	itemTokenGetter            ItemTokenGetter
	itemGainer                 ItemGainer
	analyticsTracker           analytics.Tracker
	metricsCollector           MetricsCollector
}

// NewProviderResponseVerifier instantiates a new ProviderResponseVerifier.
func NewProviderResponseVerifier(
	googlePlayVerifier GooglePlayVerifier,
	appleAppStoreVerifier AppleAppStoreVerifier,
	samsungGalaxyStoreVerifier SamsungGalaxyStoreVerifier,
	productConverter ProductConverter,
	itemTokenGetter ItemTokenGetter,
	itemGainer ItemGainer,
	analyticsTracker analytics.Tracker,
	metricsCollector MetricsCollector,
) *ProviderResponseVerifier {
	return &ProviderResponseVerifier{
		googlePlayVerifier:         googlePlayVerifier,
		appleAppStoreVerifier:      appleAppStoreVerifier,
		samsungGalaxyStoreVerifier: samsungGalaxyStoreVerifier,
		productConverter:           productConverter,
		itemTokenGetter:            itemTokenGetter,
		itemGainer:                 itemGainer,
		analyticsTracker:           analyticsTracker,
		metricsCollector:           metricsCollector,
	}
}

func (v *ProviderResponseVerifier) VerifyGooglePlayPayment(ctx context.Context, accountID proto.AccountID, resp *proto.GooglePlayPaymentResponse) error {
	if v.googlePlayVerifier == nil {
		return fmt.Errorf("google play verifier is disabled")
	}

	provider := proto.PaymentProvider_GOOGLE_PLAY

	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		payment, err := v.initiatePayment(sess, accountID, provider, resp.TransactionId)
		if err != nil {
			return fmt.Errorf("initiate payment: %w", err)
		}

		if err := payment.StoreLog(sess, resp); err != nil {
			return fmt.Errorf("log provider response: %w", err)
		}

		verificationResponse, err := v.googlePlayVerifier.Verify(ctx, resp.PackageNameAndroid, resp.ProductId, resp.PurchaseToken)
		if err != nil {
			return fmt.Errorf("verify: %w", err)
		}

		if err := payment.StoreLog(sess, verificationResponse); err != nil {
			return fmt.Errorf("log verification response: %w", err)
		}

		if err := v.validateGooglePlayResponse(resp, verificationResponse); err != nil {
			return fmt.Errorf("validate response: %w", err)
		}

		itemType, tokenID, amount, err := v.getTokenIDAndAmount(provider, resp.ProductId)
		if err != nil {
			return fmt.Errorf("get token ID and amount: %w", err)
		}

		err = v.gainItemAndFinalizePayment(sess, payment, tokenID, amount)
		if err != nil {
			return fmt.Errorf("gain item and finalize payment: %w", err)
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			return fmt.Errorf("find account: %w", err)
		}

		analyticsItemPurchase := proto.AnalyticsItemPurchase{
			AccountID:     account.ID,
			ProductID:     resp.ProductId,
			Currency:      resp.Currency,
			PricePerUnit:  resp.TotalPrice / float32(amount),
			Quantity:      uint32(amount),
			TotalPrice:    resp.TotalPrice,
			Platform:      "android",
			TransactionID: resp.TransactionId,
			Token:         resp.ProductId[:strings.LastIndex(resp.ProductId, "_")],
			ItemType:      *itemType,
		}

		_ = v.analyticsTracker.TrackItemPurchase(nil, &analyticsItemPurchase)

		v.metricsCollector.TrackPayment(provider, proto.PaymentStatus_SUCCEEDED, resp.ProductId, 1, proto.ItemType_USDC)

		return nil
	}, nil)
	if err != nil {
		v.metricsCollector.TrackPayment(provider, proto.PaymentStatus_FAILED, resp.ProductId, 1, proto.ItemType_USDC)

		return fmt.Errorf("tx ID: %s, %w", resp.TransactionId, err)
	}

	return nil
}

func (v *ProviderResponseVerifier) VerifyAppleAppStorePayment(ctx context.Context, accountID proto.AccountID, resp *proto.AppleAppStorePaymentResponse) error {
	if v.appleAppStoreVerifier == nil {
		return fmt.Errorf("apple app store verifier is disabled")
	}

	provider := proto.PaymentProvider_APPLE_APP_STORE

	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		payment, err := v.initiatePayment(sess, accountID, provider, resp.TransactionId)
		if err != nil {
			return fmt.Errorf("initiate payment: %w", err)
		}

		if err := payment.StoreLog(sess, resp); err != nil {
			return fmt.Errorf("log provider response: %w", err)
		}

		verificationResponse, err := v.appleAppStoreVerifier.Verify(ctx, resp.TransactionReceipt)
		if err != nil {
			return fmt.Errorf("verify: %w", err)
		}

		if err := payment.StoreLog(sess, verificationResponse); err != nil {
			return fmt.Errorf("log verification response: %w", err)
		}

		productID, err := v.validateAppleAppStoreResponse(resp, verificationResponse)
		if err != nil {
			return fmt.Errorf("validate response: %w", err)
		}

		itemType, tokenID, amount, err := v.getTokenIDAndAmount(provider, productID)
		if err != nil {
			return fmt.Errorf("get item type and amount: %w", err)
		}

		err = v.gainItemAndFinalizePayment(sess, payment, tokenID, amount)
		if err != nil {
			return fmt.Errorf("gain item and finalize payment: %w", err)
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			return fmt.Errorf("find account: %w", err)
		}

		analyticsItemPurchase := proto.AnalyticsItemPurchase{
			AccountID:     account.ID,
			ProductID:     resp.ProductId,
			Currency:      resp.Currency,
			PricePerUnit:  resp.TotalPrice / float32(amount),
			Quantity:      uint32(amount),
			TotalPrice:    resp.TotalPrice,
			Platform:      "ios",
			TransactionID: resp.TransactionId,
			Token:         resp.ProductId[:strings.LastIndex(resp.ProductId, "_")],
			ItemType:      *itemType,
		}

		_ = v.analyticsTracker.TrackItemPurchase(nil, &analyticsItemPurchase)

		v.metricsCollector.TrackPayment(provider, proto.PaymentStatus_SUCCEEDED, resp.ProductId, 1, proto.ItemType_USDC)

		return nil
	}, nil)
	if err != nil {
		v.metricsCollector.TrackPayment(provider, proto.PaymentStatus_FAILED, resp.ProductId, 1, proto.ItemType_USDC)

		return fmt.Errorf("tx ID: %s, %w", resp.TransactionId, err)
	}

	return nil
}

func (v *ProviderResponseVerifier) VerifySamsungGalaxyStorePayment(ctx context.Context, accountID proto.AccountID, resp *proto.SamsungGalaxyStorePaymentResponse) error {
	if v.samsungGalaxyStoreVerifier == nil {
		return fmt.Errorf("samsung galaxy store verifier is disabled")
	}

	provider := proto.PaymentProvider_SAMSUNG_GALAXY_STORE

	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		payment, err := v.initiatePayment(sess, accountID, provider, resp.PaymentId)
		if err != nil {
			return fmt.Errorf("initiate payment: %w", err)
		}

		if err := payment.StoreLog(sess, resp); err != nil {
			return fmt.Errorf("log provider response: %w", err)
		}

		verificationResponse, err := v.samsungGalaxyStoreVerifier.Verify(ctx, resp.PurchaseId)
		if err != nil {
			return fmt.Errorf("verify: %w", err)
		}

		if err := payment.StoreLog(sess, verificationResponse); err != nil {
			return fmt.Errorf("log verification response: %w", err)
		}

		err = v.validateSamsungGalaxyStoreResponse(resp, verificationResponse)
		if err != nil {
			return fmt.Errorf("validate response: %w", err)
		}

		itemType, tokenID, amount, err := v.getTokenIDAndAmount(provider, verificationResponse.ItemID)
		if err != nil {
			return fmt.Errorf("get item type and amount: %w", err)
		}

		err = v.gainItemAndFinalizePayment(sess, payment, tokenID, amount)
		if err != nil {
			return fmt.Errorf("gain item and finalize payment: %w", err)
		}

		totalPrice, err := strconv.ParseFloat(verificationResponse.PaymentAmount, 64)
		if err != nil {
			return fmt.Errorf("parse total price: %w", err)
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			return fmt.Errorf("find account: %w", err)
		}

		analyticsItemPurchase := proto.AnalyticsItemPurchase{
			AccountID:     account.ID,
			ProductID:     verificationResponse.ItemID,
			Currency:      verificationResponse.CurrencyCode,
			PricePerUnit:  float32(totalPrice) / float32(amount),
			Quantity:      uint32(amount),
			TotalPrice:    float32(totalPrice),
			Platform:      "samsung",
			TransactionID: verificationResponse.PaymentID,
			Token:         verificationResponse.ItemID[:strings.LastIndex(verificationResponse.ItemID, "_")],
			ItemType:      *itemType,
		}

		_ = v.analyticsTracker.TrackItemPurchase(nil, &analyticsItemPurchase)

		v.metricsCollector.TrackPayment(provider, proto.PaymentStatus_SUCCEEDED, verificationResponse.ItemID, 1, proto.ItemType_USDC)

		return nil
	}, nil)
	if err != nil {
		v.metricsCollector.TrackPayment(provider, proto.PaymentStatus_FAILED, resp.ItemId, 1, proto.ItemType_USDC)

		return fmt.Errorf("tx ID: %s, %w", resp.PaymentId, err)
	}

	return nil
}

func (v *ProviderResponseVerifier) initiatePayment(sess db.Session, accountID proto.AccountID, provider proto.PaymentProvider, transactionID string) (*data.Payment, error) {
	payment, err := initiatePayment(sess, accountID, provider, transactionID)
	if err != nil {
		return nil, fmt.Errorf("initiate payment: %w", err)
	}

	switch *payment.Status {
	case proto.PaymentStatus_INITIATED:
	case proto.PaymentStatus_FAILED:
	default:
		return nil, fmt.Errorf("payment cannot be verified, it is %s", payment.Status)
	}

	return payment, nil
}

func (v *ProviderResponseVerifier) validateAppleAppStoreResponse(resp *proto.AppleAppStorePaymentResponse, verificationResponse *appleappstore.Response) (productID string, err error) {
	for _, inApp := range verificationResponse.Receipt.InApp {
		if inApp.TransactionID == resp.TransactionId {
			return inApp.ProductID, nil
		}
	}

	return "", fmt.Errorf("transaction %q not found", resp.TransactionId)
}

func (v *ProviderResponseVerifier) validateGooglePlayResponse(resp *proto.GooglePlayPaymentResponse, verificationResponse *androidpublisher.ProductPurchase) error {
	if verificationResponse.OrderId != resp.TransactionId {
		return fmt.Errorf("order ID %q does not match", verificationResponse.OrderId)
	}

	if verificationResponse.PurchaseState != 0 {
		return fmt.Errorf("state is not 'purchased'")
	}

	return nil
}

func (v *ProviderResponseVerifier) validateSamsungGalaxyStoreResponse(resp *proto.SamsungGalaxyStorePaymentResponse, verificationResponse *samsunggalaxystore.Response) error {
	if verificationResponse.PaymentID != resp.PaymentId {
		return fmt.Errorf("payment ID %q does not match, expected %q", verificationResponse.PaymentID, resp.PaymentId)
	}

	if verificationResponse.ItemID != resp.ItemId {
		return fmt.Errorf("item ID %q does not match, expected %q", verificationResponse.ItemID, resp.ItemId)
	}

	if verificationResponse.Status != samsunggalaxystore.ResponseStatusSuccess {
		return fmt.Errorf("status is %q, expected %q", verificationResponse.Status, samsunggalaxystore.ResponseStatusSuccess)
	}

	return nil
}

func (v *ProviderResponseVerifier) getTokenIDAndAmount(provider proto.PaymentProvider, product string) (itemType *proto.ItemType, tokenID uint64, amount int64, err error) {
	itemType, err = v.productConverter.ToItemType(provider, product)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("convert product to item type: %w", err)
	}

	amount = v.productConverter.ToAmount(product)

	tokenID, err = v.itemTokenGetter.GetToken(*itemType)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("get token ID: %w", err)
	}

	return itemType, tokenID, amount, nil
}

func (v *ProviderResponseVerifier) gainItemAndFinalizePayment(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) error {
	err := v.itemGainer.Gain(sess, payment, tokenID, amount)
	if err != nil {
		return fmt.Errorf("gain item: %w", err)
	}

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
		return fmt.Errorf("payment is already successful, external id: %s", payment.ExternalTxnID)
	}

	payment.Status = proto.PaymentStatusPtr(proto.PaymentStatus_SUCCEEDED)

	if err := sess.Save(payment); err != nil {
		return fmt.Errorf("save successful payment: %w", err)
	}

	return nil
}

// GooglePlayVerifier verifies the purchase.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/google_play_verifier.go -package mock . GooglePlayVerifier
type GooglePlayVerifier interface {
	Verify(ctx context.Context, packageName string, productID string, token string) (*androidpublisher.ProductPurchase, error)
}

// AppleAppStoreVerifier verifies the purchase.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/apple_app_store_verifier.go -package mock . AppleAppStoreVerifier
type AppleAppStoreVerifier interface {
	Verify(ctx context.Context, receiptData string) (*appleappstore.Response, error)
}

// SamsungGalaxyStoreVerifier verifies the purchase.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/samsung_galaxy_store_verifier.go -package mock . SamsungGalaxyStoreVerifier
type SamsungGalaxyStoreVerifier interface {
	Verify(ctx context.Context, purchaseID string) (*samsunggalaxystore.Response, error)
}

// ItemGainer gains an item to the account.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/item_gainer.go -package mock . ItemGainer
type ItemGainer interface {
	Gain(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) error
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/metrics_collector.go -package mock . MetricsCollector
type MetricsCollector interface {
	TrackPayment(provider proto.PaymentProvider, status proto.PaymentStatus, productCode string, quantity uint64, paidIn proto.ItemType)
}
