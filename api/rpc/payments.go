package rpc

import (
	"context"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) ListPaymentProviderProducts(_ context.Context, provider *proto.PaymentProvider, itemType *proto.ItemType) ([]*proto.PaymentProviderProduct, error) {
	products := data.ListPaymentProviderProducts(*provider, itemType, proto.ItemType_USDC)

	var result []*proto.PaymentProviderProduct

	for _, product := range products {
		result = append(result, product.PaymentProviderProduct)
	}

	return result, nil
}

func (s *Server) VerifyGooglePlayPayment(ctx context.Context, providerResponse *proto.GooglePlayPaymentResponse) (bool, error) {
	logger := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok || account == nil {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	err := s.PaymentProviderResponseVerifier.VerifyGooglePlayPayment(ctx, account.ID, providerResponse)
	if err != nil {
		logger.Err(err).Msg("verify Google Play payment")

		return false, proto.ErrorInternal("verify Google Play payment")
	}

	return true, nil
}

func (s *Server) VerifyAppleAppStorePayment(ctx context.Context, providerResponse *proto.AppleAppStorePaymentResponse) (bool, error) {
	logger := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok || account == nil {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	err := s.PaymentProviderResponseVerifier.VerifyAppleAppStorePayment(ctx, account.ID, providerResponse)
	if err != nil {
		logger.Err(err).Msg("verify Apple App Store payment")

		return false, proto.ErrorInternal("verify Apple App Store payment")
	}

	return true, nil
}

func (s *Server) VerifySamsungGalaxyStorePayment(ctx context.Context, providerResponse *proto.SamsungGalaxyStorePaymentResponse) (bool, error) {
	logger := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok || account == nil {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	err := s.PaymentProviderResponseVerifier.VerifySamsungGalaxyStorePayment(ctx, account.ID, providerResponse)
	if err != nil {
		logger.Err(err).Msg("verify Samsung Galaxy Store payment")

		return false, proto.ErrorInternal("verify Samsung Galaxy Store payment")
	}

	return true, nil
}

func (s *Server) CreateStripePaymentIntent(ctx context.Context, productID string) (*proto.StripeCheckout, error) {
	logger := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok || account == nil {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	checkout, err := s.PaymentIntentCreator.CreateStripeIntent(ctx, account.ID, productID)
	if err != nil {
		logger.Err(err).Msg("create payment intent")

		return nil, proto.ErrorInternal("create payment intent")
	}

	return checkout, nil
}

func (s *Server) StripeEventWebhook(ctx context.Context, id string, object string, data *proto.StripeEventData) error {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if len(id) == 0 {
		logger.Error().Msgf("ID is empty")

		return proto.ErrorInvalidArgument("ID", "cannot be empty")
	}

	if object != "event" {
		logger.Error().Msgf("object is invalid, id: %s, object: %s", id, object)

		return proto.ErrorInvalidArgument("object", "is invalid")
	}

	if data == nil {
		logger.Error().Msgf("data are empty, id: %s, object: %s", id, object)

		return proto.ErrorInvalidArgument("data", "cannot be empty")
	}

	if data.Object.Object != "checkout.session" {
		logger.Error().Msgf("unsupported data object, id: %s, object: %s, data object: %s", id, object, data.Object.Object)

		return proto.ErrorInvalidArgument("data object", "unsupported")
	}

	err := repo.Tasks().EnqueueTaskIgnoringDuplicates(jobqueue.StripeEventWorkGroup, jobqueue.StripeEventTask{
		EventID: id,
	}, nil, nil)
	if err != nil {
		logger.Err(err).Msgf("enqueue Stripe event task, id: %s, object: %s, data object: %s", id, object, data.Object.Object)

		return proto.ErrorInternal("handle Stripe event")
	}

	return nil
}

func (s *Server) PrepareOnChainTransaction(ctx context.Context, productID string) ([]*proto.OnChainTransaction, error) {
	return s.PrepareOnChainInCurrencyTransaction(ctx, productID, 1)
}

func (s *Server) PrepareOnChainInCurrencyTransaction(ctx context.Context, productID string, quantity uint64) ([]*proto.OnChainTransaction, error) {
	logger := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok || account == nil {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	transactions, err := s.OnChainTransactionComposer.ComposeERC20(ctx, account.ID, productID, quantity)
	if err != nil {
		logger.Err(err).Msg("compose on-chain transaction")

		return nil, proto.ErrorInternal("compose Sequence transaction")
	}

	return transactions, nil
}

func (s *Server) PrepareOnChainInItemsTransaction(ctx context.Context, productID string, quantity uint64, tokenIDsToBurn []uint64) ([]*proto.OnChainTransaction, error) {
	logger := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok || account == nil {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	transactions, err := s.OnChainTransactionComposer.ComposeERC1155(ctx, account.ID, productID, quantity, tokenIDsToBurn)
	if err != nil {
		logger.Err(err).Msg("compose on-chain transaction")

		return nil, proto.ErrorInternal("compose Sequence transaction")
	}

	return transactions, nil
}

func (s *Server) GMListPayments(ctx context.Context, page *proto.Page, status *proto.PaymentStatus, provider *proto.PaymentProvider, address *string) (*proto.Page, []*proto.Payment, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	cond := db.Cond{}

	if status != nil {
		cond["status"] = status
	}

	if provider != nil {
		cond["provider"] = provider
	}

	if address != nil {
		account, err := data.DB.Accounts(repo).FindByAddress(proto.HashFromString(*address))
		if err != nil {
			logger.Err(err).Msgf("find account %s", *address)
			return nil, nil, proto.ErrorInternal("find account failed")
		}

		cond["account_id"] = account.ID
	}

	paymentsResult := data.DB.Payments(repo).Find(cond)

	cursorKey := &proto.SortBy{
		Column: "created_at",
		Order:  &sortOrder_DESC,
	}

	paginator, err := NewPaginator(page, cursorKey)
	if err != nil {
		logger.Err(err).Msg("invalid page settings")

		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	var payments []*data.Payment

	if err := paginator.Source(paymentsResult).Get(ctx, &payments); err != nil {
		logger.Err(err).Msg("get page")

		return nil, nil, proto.WrapError(proto.ErrInternal, err, "get page")
	}

	paymentsProto := make([]*proto.Payment, len(payments))

	for i, payment := range payments {
		paymentsProto[i] = payment.Payment
	}

	return paginator.Page(), paymentsProto, nil
}

func (s *Server) GMListPaymentLogs(ctx context.Context, paymentID uint64) ([]*proto.PaymentLog, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if paymentID == 0 {
		return nil, proto.ErrorInvalidArgument("paymentID", "cannot be zero")
	}

	var paymentLogs []*data.PaymentLog

	if err := repo.PaymentsLogs().Find(db.Cond{"payment_id": paymentID}).OrderBy("-created_at").All(&paymentLogs); err != nil {
		logger.Err(err).Msg("find payment logs")

		return nil, proto.WrapError(proto.ErrInternal, err, "find payment logs")
	}

	paymentLogsProto := make([]*proto.PaymentLog, len(paymentLogs))

	for i, paymentLog := range paymentLogs {
		paymentLogsProto[i] = paymentLog.PaymentLog
	}

	return paymentLogsProto, nil
}

// PaymentProviderResponseVerifier verifies purchase responses sent from the mobile.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/payment_provider_response_verifier.go -package mock . PaymentProviderResponseVerifier
type PaymentProviderResponseVerifier interface {
	VerifyGooglePlayPayment(context.Context, proto.AccountID, *proto.GooglePlayPaymentResponse) error
	VerifyAppleAppStorePayment(context.Context, proto.AccountID, *proto.AppleAppStorePaymentResponse) error
	VerifySamsungGalaxyStorePayment(context.Context, proto.AccountID, *proto.SamsungGalaxyStorePaymentResponse) error
}

// PaymentIntentCreator creates an intent for payment.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/payment_intent_creator.go -package mock . PaymentIntentCreator
type PaymentIntentCreator interface {
	CreateStripeIntent(ctx context.Context, accountID proto.AccountID, productID string) (*proto.StripeCheckout, error)
}

// OnChainTransactionComposer composes new transaction for on-chain payment.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/onchain_transaction_composer.go -package mock . OnChainTransactionComposer
type OnChainTransactionComposer interface {
	ComposeERC20(ctx context.Context, accountID proto.AccountID, productID string, quantity uint64) ([]*proto.OnChainTransaction, error)
	ComposeERC1155(ctx context.Context, accountID proto.AccountID, productID string, quantity uint64, tokenIDsToBurn []uint64) ([]*proto.OnChainTransaction, error)
}
