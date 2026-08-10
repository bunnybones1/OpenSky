package contracts

import (
	"fmt"
	"math/big"

	"github.com/0xsequence/ethkit/ethartifact"
	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"
	"github.com/0xsequence/ethkit/go-ethereum/core/types"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	erc1155FunctionNameSafeBatchTransferFrom = "safeBatchTransferFrom"

	erc1155EventNameTransferBatch = "TransferBatch"
)

// erc1155RequiredFunctions is used for validation when passing artifact.
var erc1155RequiredFunctions = []string{
	erc1155FunctionNameSafeBatchTransferFrom,
}

// erc1155RequiredEvents is used for validation when passing artifact.
var erc1155RequiredEvents = []string{
	erc1155EventNameTransferBatch,
}

type ERC1155 struct {
	artifact ethartifact.Artifact
	address  common.Address

	eventTransferBatchTopic common.Hash
}

func NewERC1155(artifact ethartifact.Artifact, address string) (*ERC1155, error) {
	for _, function := range erc1155RequiredFunctions {
		if _, ok := artifact.ABI.Methods[function]; !ok {
			return nil, fmt.Errorf("function '%s' does not exist", function)
		}
	}

	for _, event := range erc1155RequiredEvents {
		if _, ok := artifact.ABI.Events[event]; !ok {
			return nil, fmt.Errorf("event '%s' does not exist", event)
		}
	}

	return &ERC1155{
		artifact:                artifact,
		address:                 common.HexToAddress(address),
		eventTransferBatchTopic: artifact.ABI.Events[erc1155EventNameTransferBatch].ID,
	}, nil
}

func (c *ERC1155) Address() proto.Hash {
	return proto.HashFromString(c.address.String())
}

func (c *ERC1155) ComposeSafeBatchTransferFrom(from, to proto.Hash, tokens map[uint64]uint64, data []byte) (*proto.OnChainTransaction, error) {
	fromAddress := common.HexToAddress(from.String())
	toAddress := common.HexToAddress(to.String())

	var ids, amounts []*big.Int

	for tokenID, tokenAmount := range tokens {
		if tokenAmount == 0 {
			continue
		}

		ids = append(ids, big.NewInt(int64(tokenID)))
		amounts = append(amounts, big.NewInt(int64(tokenAmount*100)))
	}

	transactionData, err := c.artifact.Encode(
		erc1155FunctionNameSafeBatchTransferFrom,
		fromAddress,
		toAddress,
		ids,
		amounts,
		data,
	)
	if err != nil {
		return nil, fmt.Errorf("encode artifact: %w", err)
	}

	return &proto.OnChainTransaction{
		To:   c.address.Hex(),
		Data: hexutil.Encode(transactionData),
	}, nil
}

func (c *ERC1155) FindAndDecodeTransferBatchEvent(log *types.Log) (*ERC1155TransferBatchEvent, error) {
	if log.Topics[0] == c.eventTransferBatchTopic {
		transferBatchEvent := &ERC1155TransferBatchEvent{
			From: proto.HashFromString(common.HexToAddress(log.Topics[2].Hex()).String()),
			To:   proto.HashFromString(common.HexToAddress(log.Topics[3].Hex()).String()),
		}

		err := c.artifact.Decode(transferBatchEvent, erc1155EventNameTransferBatch, log.Data)
		if err != nil {
			return nil, fmt.Errorf("decode data: %w", err)
		}

		return transferBatchEvent, nil
	}

	return nil, nil
}

type ERC1155TransferBatchEvent struct {
	From    proto.Hash
	To      proto.Hash
	IDs     []*big.Int `abi:"_ids"`
	Amounts []*big.Int `abi:"_amounts"`
}
