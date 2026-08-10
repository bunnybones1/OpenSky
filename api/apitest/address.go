package apitest

import (
	crand "crypto/rand"
	"fmt"
	mrand "math/rand"

	"github.com/horizon-games/OpenSky/api/proto"
)

func RandomAddress() proto.Hash {
	buf := make([]byte, 20)
	if _, err := crand.Read(buf); err != nil {
		panic(err.Error())
	}

	return proto.HashFromString(fmt.Sprintf("0x%02x", buf))
}

func RandomTxnHash() proto.Hash {
	buf := make([]byte, 32)
	if _, err := crand.Read(buf); err != nil {
		panic(err.Error())
	}

	return proto.HashFromString(fmt.Sprintf("0x%02x", buf))
}

func RandomAccountID() proto.AccountID {
	return proto.AccountID(mrand.Uint32())
}
