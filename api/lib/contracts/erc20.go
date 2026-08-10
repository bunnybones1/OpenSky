package contracts

import (
	"context"
	"fmt"
	"math/big"
	"time"

	"github.com/0xsequence/ethkit/ethartifact"
	"github.com/0xsequence/ethkit/ethrpc"
	"github.com/0xsequence/ethkit/go-ethereum"
	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"
	"github.com/0xsequence/ethkit/go-ethereum/core/types"
	lru "github.com/hashicorp/golang-lru"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	erc20FunctionNameApprove   = "approve"
	erc20FunctionNameTransfer  = "transfer"
	erc20FunctionNameBalanceOf = "balanceOf"

	erc20EventNameTransfer = "Transfer"
)

// erc20RequiredFunctions is used for validation when passing artifact.
var erc20RequiredFunctions = []string{
	erc20FunctionNameApprove,
	erc20FunctionNameTransfer,
	erc20FunctionNameBalanceOf,
}

// erc20RequiredEvents is used for validation when passing artifact.
var erc20RequiredEvents = []string{
	erc20EventNameTransfer,
}

type ERC20 struct {
	artifact     ethartifact.Artifact
	address      common.Address
	provider     *ethrpc.Provider
	balanceCache *lru.Cache

	eventTransferTopic common.Hash
}

func NewERC20(artifact ethartifact.Artifact, address string, provider *ethrpc.Provider) (*ERC20, error) {
	for _, function := range erc20RequiredFunctions {
		if _, ok := artifact.ABI.Methods[function]; !ok {
			return nil, fmt.Errorf("function '%s' does not exist", function)
		}
	}

	for _, event := range erc20RequiredEvents {
		if _, ok := artifact.ABI.Events[event]; !ok {
			return nil, fmt.Errorf("event '%s' does not exist", event)
		}
	}

	balanceCache, err := lru.New(1000)
	if err != nil {
		return nil, fmt.Errorf("instantiaze balance cache: %w", err)
	}

	return &ERC20{
		artifact:           artifact,
		address:            common.HexToAddress(address),
		provider:           provider,
		balanceCache:       balanceCache,
		eventTransferTopic: artifact.ABI.Events[erc20EventNameTransfer].ID,
	}, nil
}

func (c *ERC20) Address() proto.Hash {
	return proto.HashFromString(c.address.String())
}

func (c *ERC20) ComposeApprove(spender proto.Hash, value *big.Int) (*proto.OnChainTransaction, error) {
	spenderAddress := common.HexToAddress(spender.String())

	transactionData, err := c.artifact.Encode(erc20FunctionNameApprove, spenderAddress, value)
	if err != nil {
		return nil, fmt.Errorf("encode artifact: %w", err)
	}

	return &proto.OnChainTransaction{
		To:   c.address.Hex(),
		Data: hexutil.Encode(transactionData),
	}, nil
}

func (c *ERC20) ComposeTransfer(to proto.Hash, value *big.Int) (*proto.OnChainTransaction, error) {
	toAddress := common.HexToAddress(to.String())

	transactionData, err := c.artifact.Encode(erc20FunctionNameTransfer, toAddress, value)
	if err != nil {
		return nil, fmt.Errorf("encode artifact: %w", err)
	}

	return &proto.OnChainTransaction{
		To:   c.address.Hex(),
		Data: hexutil.Encode(transactionData),
	}, nil
}

func (c *ERC20) CallBalanceOf(ctx context.Context, owner proto.Hash) (*big.Int, error) {
	var balance erc20Balance

	key := fmt.Sprintf("%s:%s", c.address.String(), owner.String())
	freshAmount := int64(3) // fresh for 3 seconds
	now := time.Now().Unix()

	// Attempt to load balance from cache, and check if its fresh enough
	cache, ok := c.balanceCache.Get(key)
	if ok {
		balance, ok = cache.(erc20Balance)
		if ok {
			if balance.last > 0 && now-freshAmount <= balance.last {
				return balance.balance, nil
			}
		}
	}

	ownerAddress := common.HexToAddress(owner.String())

	msgData, err := c.artifact.Encode(erc20FunctionNameBalanceOf, ownerAddress)
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

	output := &erc20BalanceOfResponse{}

	err = c.artifact.Decode(output, erc20FunctionNameBalanceOf, resp)
	if err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	balance.balance = output.Balance
	balance.last = now

	c.balanceCache.Add(key, balance)

	return balance.balance, nil
}

func (c *ERC20) FindAndDecodeTransferEvent(log *types.Log) (*ERC20TransferEvent, error) {
	if log.Topics[0] == c.eventTransferTopic {
		transferEvent := &ERC20TransferEvent{
			From: proto.HashFromString(common.HexToAddress(log.Topics[1].Hex()).String()),
			To:   proto.HashFromString(common.HexToAddress(log.Topics[2].Hex()).String()),
		}

		err := c.artifact.Decode(transferEvent, erc20EventNameTransfer, log.Data)
		if err != nil {
			return nil, fmt.Errorf("decode data: %w", err)
		}

		return transferEvent, nil
	}

	return nil, nil
}

type erc20Balance struct {
	balance *big.Int
	last    int64 // unix timestamp
}

type erc20BalanceOfResponse struct {
	Balance *big.Int `abi:"balance"`
}

type ERC20TransferEvent struct {
	From  proto.Hash
	To    proto.Hash
	Value *big.Int
}
