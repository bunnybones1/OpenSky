package payments

import (
	"context"
	"fmt"
	"math"
	"math/big"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type OnChainTransactionComposer struct {
	productConverter      ProductConverter
	itemTokenGetter       ItemTokenGetter
	contractUSDC          ContractUSDC
	contractOpenSkyAssets ContractOpenSkyAssets
	contractPaymentProxy  ContractPaymentProxy

	currencyContractAddress proto.Hash
	paymentContractAddress  proto.Hash
}

func NewOnChainTransactionComposer(
	productConverter ProductConverter,
	itemTokenGetter ItemTokenGetter,
	contractUSDC ContractUSDC,
	contractOpenSkyAssets ContractOpenSkyAssets,
	contractPaymentProxy ContractPaymentProxy,
) *OnChainTransactionComposer {
	return &OnChainTransactionComposer{
		productConverter:        productConverter,
		itemTokenGetter:         itemTokenGetter,
		contractUSDC:            contractUSDC,
		contractOpenSkyAssets:   contractOpenSkyAssets,
		contractPaymentProxy:    contractPaymentProxy,
		currencyContractAddress: contractUSDC.Address(),
		paymentContractAddress:  contractPaymentProxy.Address(),
	}
}

func (c *OnChainTransactionComposer) ComposeERC20(ctx context.Context, accountID proto.AccountID, productID string, quantity uint64) ([]*proto.OnChainTransaction, error) {
	if quantity == 0 {
		return nil, fmt.Errorf("quantity cannot be zero")
	}

	provider := proto.PaymentProvider_SEQUENCE

	itemType, amount, price, err := c.getItemTypeAndAmountAndPrice(provider, productID, quantity, proto.ItemType_USDC)
	if err != nil {
		return nil, fmt.Errorf("get item type, amount and price: %w", err)
	}

	tokenID, err := c.itemTokenGetter.GetToken(*itemType)
	if err != nil {
		return nil, fmt.Errorf("get token: %w", err)
	}

	if tokenID == 0 {
		return nil, fmt.Errorf("token ID is zero, product: %s", productID)
	}

	var onChainTransactions []*proto.OnChainTransaction

	err = data.DB.TxContext(ctx, func(sess db.Session) error {
		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			return fmt.Errorf("find account: %w", err)
		}

		nonce, err := c.contractPaymentProxy.CallNonces(ctx, account.Address)
		if err != nil {
			return fmt.Errorf("get nonce: %w", err)
		}

		payment, err := initiatePayment(sess, accountID, provider, nonce.String())
		if err != nil {
			return fmt.Errorf("initiate payment: %w", err)
		}

		request := OnChainTransactionRequest{
			ProductID: productID,
			Quantity:  quantity,
		}

		if err := payment.StoreLog(sess, request); err != nil {
			return fmt.Errorf("log request: %w", err)
		}

		onChainTransactions, err = c.composeERC20Transactions(account.Address, nonce, price, tokenID, amount)
		if err != nil {
			return fmt.Errorf("compose transaction: %w", err)
		}

		if err := payment.StoreLog(sess, onChainTransactions); err != nil {
			return fmt.Errorf("log on-chain transaction: %w", err)
		}

		if err := c.updatePayment(sess, payment); err != nil {
			return fmt.Errorf("update payment: %w", err)
		}

		return nil
	}, nil)
	if err != nil {
		return nil, err
	}

	return onChainTransactions, nil
}

func (c *OnChainTransactionComposer) composeERC20Transactions(address proto.Hash, nonce *big.Int, price *big.Float, tokenID uint64, amount int64) ([]*proto.OnChainTransaction, error) {
	priceCopy := big.NewFloat(0).Copy(price)
	currencyAmount, _ := priceCopy.Mul(priceCopy, big.NewFloat(math.Pow10(6))).Int(nil)

	approveTransaction, err := c.contractUSDC.ComposeApprove(c.paymentContractAddress, currencyAmount)
	if err != nil {
		return nil, fmt.Errorf("compose approve transaction: %w", err)
	}

	var idsPurchased []uint64

	for i := 1; i <= int(amount); i++ {
		idsPurchased = append(idsPurchased, tokenID)
	}

	purchaseItemsTransaction, err := c.contractPaymentProxy.ComposePurchaseItems(c.currencyContractAddress, currencyAmount, nonce, idsPurchased, address)
	if err != nil {
		return nil, fmt.Errorf("compose purchase items transaction: %w", err)
	}

	return []*proto.OnChainTransaction{
		approveTransaction,
		purchaseItemsTransaction,
	}, nil
}

func (c *OnChainTransactionComposer) ComposeERC1155(ctx context.Context, accountID proto.AccountID, productID string, quantity uint64, tokenIDsToBurn []uint64) ([]*proto.OnChainTransaction, error) {
	if quantity == 0 {
		return nil, fmt.Errorf("quantity cannot be zero")
	}

	if len(tokenIDsToBurn) == 0 {
		return nil, fmt.Errorf("tokens to burn cannot be empty")
	}

	provider := proto.PaymentProvider_SEQUENCE

	priceItemType, err := c.validateTokensToBurn(tokenIDsToBurn)
	if err != nil {
		return nil, fmt.Errorf("validate tokens to burn: %w", err)
	}

	itemType, amount, price, err := c.getItemTypeAndAmountAndPrice(provider, productID, quantity, priceItemType)
	if err != nil {
		return nil, fmt.Errorf("get item type and amount: %w", err)
	}

	if price.Cmp(big.NewFloat(float64(len(tokenIDsToBurn)))) != 0 {
		return nil, fmt.Errorf("price cannot be different than provided tokens, price: %s, tokens amount: %d", price.String(), len(tokenIDsToBurn))
	}

	tokenID, err := c.itemTokenGetter.GetToken(*itemType)
	if err != nil {
		return nil, fmt.Errorf("get token: %w", err)
	}

	if tokenID == 0 {
		return nil, fmt.Errorf("token ID is zero, product: %s", productID)
	}

	var onChainTransactions []*proto.OnChainTransaction

	err = data.DB.TxContext(ctx, func(sess db.Session) error {
		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			return fmt.Errorf("find account: %w", err)
		}

		nonce, err := c.contractPaymentProxy.CallNonces(ctx, account.Address)
		if err != nil {
			return fmt.Errorf("get nonce: %w", err)
		}

		payment, err := initiatePayment(sess, accountID, provider, nonce.String())
		if err != nil {
			return fmt.Errorf("initiate payment: %w", err)
		}

		request := OnChainTransactionRequest{
			ProductID:      productID,
			Quantity:       quantity,
			TokenIDsToBurn: tokenIDsToBurn,
		}

		if err := payment.StoreLog(sess, request); err != nil {
			return fmt.Errorf("log request: %w", err)
		}

		onChainTransactions, err = c.composeERC1155Transactions(account.Address, nonce, tokenIDsToBurn, tokenID, amount)
		if err != nil {
			return fmt.Errorf("compose transaction: %w", err)
		}

		if err := payment.StoreLog(sess, onChainTransactions); err != nil {
			return fmt.Errorf("log on-chain transaction: %w", err)
		}

		if err := c.updatePayment(sess, payment); err != nil {
			return fmt.Errorf("update payment: %w", err)
		}

		return nil
	}, nil)
	if err != nil {
		return nil, err
	}

	return onChainTransactions, nil
}

func (c *OnChainTransactionComposer) validateTokensToBurn(tokenIDsToBurn []uint64) (proto.ItemType, error) {
	var itemType proto.ItemType

	for _, tokenID := range tokenIDsToBurn {
		it, _, err := data.SWTokenID2TypeAndItemID(tokenID)
		if err != nil {
			return proto.ItemType_UNKNOWN, fmt.Errorf("token ID to item type: %w", err)
		}

		if itemType == proto.ItemType_UNKNOWN {
			itemType = it
		}

		if itemType != it {
			return proto.ItemType_UNKNOWN, fmt.Errorf("tokens to burn cannot be mix type: %v", tokenIDsToBurn)
		}
	}

	return itemType, nil
}

func (c *OnChainTransactionComposer) composeERC1155Transactions(address proto.Hash, nonce *big.Int, tokenIDsToBurn []uint64, tokenID uint64, amount int64) ([]*proto.OnChainTransaction, error) {
	tokensToBurn := make(map[uint64]uint64)

	for _, tokenIDToBurn := range tokenIDsToBurn {
		tokensToBurn[tokenIDToBurn]++
	}

	var idsPurchased []uint64

	for i := 1; i <= int(amount); i++ {
		idsPurchased = append(idsPurchased, tokenID)
	}

	data, err := c.contractPaymentProxy.EncodeBurnOrderData(address, nonce, idsPurchased)
	if err != nil {
		return nil, fmt.Errorf("pack data: %w", err)
	}

	transaction, err := c.contractOpenSkyAssets.ComposeSafeBatchTransferFrom(address, c.paymentContractAddress, tokensToBurn, data)
	if err != nil {
		return nil, fmt.Errorf("compose safe batch transfer from transaction: %w", err)
	}

	return []*proto.OnChainTransaction{
		transaction,
	}, nil
}

func (c *OnChainTransactionComposer) getItemTypeAndAmountAndPrice(provider proto.PaymentProvider, product string, quantity uint64, priceItemType proto.ItemType) (itemType *proto.ItemType, amount int64, price *big.Float, err error) {
	itemType, err = c.productConverter.ToItemType(provider, product)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("convert product to item type: %w", err)
	}

	amount = c.productConverter.ToAmount(product)

	amount = amount * int64(quantity)

	price, err = c.productConverter.ToPrice(provider, product, priceItemType)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("convert product to price: %w", err)
	}

	if price == nil {
		return nil, 0, nil, fmt.Errorf("price is nil, provider: %s, product: %s", provider, product)
	}

	if price.Sign() == 0 {
		return nil, 0, nil, fmt.Errorf("price is zero, provider: %s, product: %s", provider, product)
	}

	if price.Sign() == -1 {
		return nil, 0, nil, fmt.Errorf("price is negative, provider: %s, product: %s, price: %s", provider, product, price.String())
	}

	price = big.NewFloat(0).Copy(price)
	price.Mul(price, big.NewFloat(float64(quantity)))

	return itemType, amount, price, nil
}

func (c *OnChainTransactionComposer) updatePayment(sess db.Session, payment *data.Payment) error {
	payment.Status = proto.PaymentStatusPtr(proto.PaymentStatus_PENDING)

	if err := sess.Save(payment); err != nil {
		return fmt.Errorf("save pending payment: %w", err)
	}

	return nil
}

type OnChainTransactionRequest struct {
	ProductID      string   `json:"product_id"`
	Quantity       uint64   `json:"quantity"`
	TokenIDsToBurn []uint64 `json:"token_ids_to_burn"`
}

// ItemTokenGetter gets token ID.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/item_token_getter.go -package mock . ItemTokenGetter
type ItemTokenGetter interface {
	GetToken(proto.ItemType) (uint64, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/contract_usdc.go -package mock . ContractUSDC
type ContractUSDC interface {
	Address() proto.Hash
	ComposeApprove(spender proto.Hash, value *big.Int) (*proto.OnChainTransaction, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/contract_opensky_assets.go -package mock . ContractOpenSkyAssets
type ContractOpenSkyAssets interface {
	ComposeSafeBatchTransferFrom(from, to proto.Hash, tokens map[uint64]uint64, data []byte) (*proto.OnChainTransaction, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/contract_payment_proxy.go -package mock . ContractPaymentProxy
type ContractPaymentProxy interface {
	Address() proto.Hash
	ComposePurchaseItems(currencyAddress proto.Hash, currencyAmount *big.Int, nonce *big.Int, itemIDsPurchased []uint64, recipient proto.Hash) (*proto.OnChainTransaction, error)
	CallNonces(ctx context.Context, address proto.Hash) (*big.Int, error)
	EncodeBurnOrderData(itemRecipient proto.Hash, nonce *big.Int, itemIDsPurchased []uint64) ([]byte, error)
}
