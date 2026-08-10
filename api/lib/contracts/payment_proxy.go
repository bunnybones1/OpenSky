package contracts

import (
	"context"
	"fmt"
	"math/big"

	"github.com/0xsequence/ethkit/ethartifact"
	"github.com/0xsequence/ethkit/ethrpc"
	"github.com/0xsequence/ethkit/go-ethereum"
	"github.com/0xsequence/ethkit/go-ethereum/accounts/abi"
	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"
	"github.com/0xsequence/ethkit/go-ethereum/core/types"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	paymentProxyFunctionNameNonces        = "nonces"
	paymentProxyFunctionNamePurchaseItems = "purchaseItems"

	paymentProxyEventNameItemPurchase = "ItemPurchase"
	paymentProxyEventNameItemBurn     = "ItemBurn"
)

// paymentProxyRequiredFunctions is used for validation when passing artifact.
var paymentProxyRequiredFunctions = []string{
	paymentProxyFunctionNameNonces,
	paymentProxyFunctionNamePurchaseItems,
}

// paymentProxyRequiredEvents is used for validation when passing artifact.
var paymentProxyRequiredEvents = []string{
	paymentProxyEventNameItemPurchase,
	paymentProxyEventNameItemBurn,
}

var paymentProxyBurnOrderDataABI abi.Arguments

func init() {
	components := []abi.ArgumentMarshaling{
		{
			Name: "itemRecipient",
			Type: "address",
		},
		{
			Name: "nonce",
			Type: "uint256",
		},
		{
			Name: "itemIDsPurchased",
			Type: "uint256[]",
		},
	}

	tuple, err := abi.NewType("tuple", "", components)
	if err != nil {
		panic(err)
	}

	paymentProxyBurnOrderDataABI = abi.Arguments{{Type: tuple}}
}

type PaymentProxy struct {
	artifact ethartifact.Artifact
	address  common.Address
	provider *ethrpc.Provider

	eventItemPurchaseTopic common.Hash
	eventItemBurnTopic     common.Hash
}

func NewPaymentProxy(artifact ethartifact.Artifact, address string, provider *ethrpc.Provider) (*PaymentProxy, error) {
	for _, function := range paymentProxyRequiredFunctions {
		if _, ok := artifact.ABI.Methods[function]; !ok {
			return nil, fmt.Errorf("function '%s' does not exist", function)
		}
	}

	for _, event := range paymentProxyRequiredEvents {
		if _, ok := artifact.ABI.Events[event]; !ok {
			return nil, fmt.Errorf("event '%s' does not exist", event)
		}
	}

	return &PaymentProxy{
		artifact:               artifact,
		address:                common.HexToAddress(address),
		provider:               provider,
		eventItemPurchaseTopic: artifact.ABI.Events[paymentProxyEventNameItemPurchase].ID,
		eventItemBurnTopic:     artifact.ABI.Events[paymentProxyEventNameItemBurn].ID,
	}, nil
}

func (c *PaymentProxy) Address() proto.Hash {
	return proto.HashFromString(c.address.String())
}

func (c *PaymentProxy) ComposePurchaseItems(currencyAddress proto.Hash, currencyAmount *big.Int, nonce *big.Int, itemIDsPurchased []uint64, recipient proto.Hash) (*proto.OnChainTransaction, error) {
	currencyContractAddress := common.HexToAddress(currencyAddress.String())

	var items []*big.Int

	for _, itemIDPurchased := range itemIDsPurchased {
		items = append(items, big.NewInt(int64(itemIDPurchased)))
	}

	recipientAddress := common.HexToAddress(recipient.String())

	transactionData, err := c.artifact.Encode(paymentProxyFunctionNamePurchaseItems, currencyContractAddress, currencyAmount, uint32(nonce.Uint64()), items, recipientAddress)
	if err != nil {
		return nil, fmt.Errorf("encode artifact: %w", err)
	}

	return &proto.OnChainTransaction{
		To:   c.address.Hex(),
		Data: hexutil.Encode(transactionData),
	}, nil
}

func (c *PaymentProxy) CallNonces(ctx context.Context, address proto.Hash) (*big.Int, error) {
	ofAddress := common.HexToAddress(address.String())

	msgData, err := c.artifact.Encode(paymentProxyFunctionNameNonces, ofAddress)
	if err != nil {
		return nil, fmt.Errorf("encode artifact: %w", err)
	}

	msg := ethereum.CallMsg{
		To:   &c.address,
		Data: msgData,
	}

	resp, err := c.provider.CallContract(ctx, msg, nil)
	if err != nil {
		return nil, fmt.Errorf("contract call: %w", err)
	}

	output := &paymentProxyNoncesResponse{}

	err = c.artifact.Decode(output, paymentProxyFunctionNameNonces, resp)
	if err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return output.Nonce, nil
}

func (c *PaymentProxy) FindAndDecodeItemPurchaseEvent(log *types.Log) (*PaymentProxyItemPurchaseEvent, error) {
	if log.Topics[0] == c.eventItemPurchaseTopic {
		itemPurchaseEvent := &PaymentProxyItemPurchaseEvent{
			Spender:       proto.HashFromString(common.HexToAddress(log.Topics[1].Hex()).String()),
			ItemRecipient: proto.HashFromString(common.HexToAddress(log.Topics[2].Hex()).String()),
			Nonce:         log.Topics[3].Big(),
		}

		err := c.artifact.Decode(itemPurchaseEvent, paymentProxyEventNameItemPurchase, log.Data)
		if err != nil {
			return nil, fmt.Errorf("decode data: %w", err)
		}

		return itemPurchaseEvent, nil
	}

	return nil, nil
}

func (c *PaymentProxy) IsItemPurchaseEvent(log *types.Log) bool {
	if len(log.Topics) == 0 {
		return false
	}

	return log.Topics[0] == c.eventItemPurchaseTopic
}

func (c *PaymentProxy) FindAndDecodeItemBurnEvent(log *types.Log) (*PaymentProxyItemBurnEvent, error) {
	if log.Topics[0] == c.eventItemBurnTopic {
		itemBurnEvent := &PaymentProxyItemBurnEvent{
			Spender:       proto.HashFromString(common.HexToAddress(log.Topics[1].Hex()).String()),
			ItemRecipient: proto.HashFromString(common.HexToAddress(log.Topics[2].Hex()).String()),
			Nonce:         log.Topics[3].Big(),
		}

		err := c.artifact.Decode(itemBurnEvent, paymentProxyEventNameItemBurn, log.Data)
		if err != nil {
			return nil, fmt.Errorf("decode data: %w", err)
		}

		return itemBurnEvent, nil
	}

	return nil, nil
}

func (c *PaymentProxy) IsItemBurnEvent(log *types.Log) bool {
	if len(log.Topics) == 0 {
		return false
	}

	return log.Topics[0] == c.eventItemBurnTopic
}

func (c *PaymentProxy) EncodeBurnOrderData(itemRecipient proto.Hash, nonce *big.Int, itemIDsPurchased []uint64) ([]byte, error) {
	var idsPurchased []*big.Int

	for _, itemIDPurchased := range itemIDsPurchased {
		idsPurchased = append(idsPurchased, big.NewInt(int64(itemIDPurchased)))
	}

	data, err := paymentProxyBurnOrderDataABI.Pack(PaymentProxyBurnOrderData{
		ItemRecipient:    common.HexToAddress(itemRecipient.String()),
		Nonce:            nonce,
		ItemIDsPurchased: idsPurchased,
	})
	if err != nil {
		return nil, fmt.Errorf("pack data: %w", err)
	}

	return data, nil
}

func (c *PaymentProxy) DecodeBurnOrderData(data []byte) (*PaymentProxyBurnOrderData, error) {
	unpacked, err := paymentProxyBurnOrderDataABI.Unpack(data)
	if err != nil {
		return nil, fmt.Errorf("unpack data: %w", err)
	}

	var dataWrapper struct {
		Data PaymentProxyBurnOrderData
	}

	err = paymentProxyBurnOrderDataABI.Copy(&dataWrapper, unpacked)
	if err != nil {
		return nil, fmt.Errorf("copy to object: %w", err)
	}

	return &dataWrapper.Data, nil
}

type paymentProxyNoncesResponse struct {
	Nonce *big.Int `abi:"nonce"`
}

type PaymentProxyItemPurchaseEvent struct {
	Spender          proto.Hash
	ItemRecipient    proto.Hash
	Nonce            *big.Int
	ItemIDsPurchased []*big.Int
}

type PaymentProxyItemBurnEvent struct {
	Spender          proto.Hash
	ItemRecipient    proto.Hash
	Nonce            *big.Int
	ItemIDsPurchased []*big.Int
}

type PaymentProxyBurnOrderData struct {
	ItemRecipient    common.Address `abi:"itemRecipient"`
	Nonce            *big.Int       `abi:"nonce"`
	ItemIDsPurchased []*big.Int     `abi:"itemIDsPurchased"`
}
