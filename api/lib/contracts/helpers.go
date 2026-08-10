package contracts

import (
	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"
	"github.com/0xsequence/go-sequence"

	"github.com/horizon-games/OpenSky/api/proto"
)

func ConvertToSequenceTransaction(transaction *proto.OnChainTransaction) *sequence.Transaction {
	data, _ := hexutil.Decode(transaction.Data)

	return &sequence.Transaction{
		To:   common.HexToAddress(transaction.To),
		Data: data,
	}
}
