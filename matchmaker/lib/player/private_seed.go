package player

import (
	cryptorand "crypto/rand"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/0xsequence/ethkit/ethcoder"
	"github.com/0xsequence/ethkit/ethwallet"
	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/crypto"

	"github.com/horizon-games/OpenSky/api/proto"
)

// When you update this, make sure to update
// /lib/shared/src/constants.ts as well.
var heroAbilities = map[proto.DeckClass]string{
	proto.DeckClass_STR: "25000",
	proto.DeckClass_AGY: "25001",
	proto.DeckClass_HRT: "25002",
	proto.DeckClass_INT: "25003",
	proto.DeckClass_WIS: "25004",
	proto.DeckClass_STA: "25009",
	proto.DeckClass_STH: "25013",
	proto.DeckClass_STI: "25026",
	proto.DeckClass_STW: "25007",
	proto.DeckClass_AGI: "25010",
	proto.DeckClass_AGW: "25008",
	proto.DeckClass_HRA: "25011",
	proto.DeckClass_HRI: "25012",
	proto.DeckClass_HRW: "25023",
	proto.DeckClass_INW: "25014",
}

type Cards []uint64

func (c Cards) MarshalJSON() ([]byte, error) {
	out := make([]string, 0, len(c))
	for i := range c {
		out = append(out, fmt.Sprintf("%d", c[i]))
	}
	return json.Marshal(out)
}

func (c *Cards) UnmarshalJSON(b []byte) error {
	in := []string{}
	if err := json.Unmarshal(b, &in); err != nil {
		return err
	}

	out := make([]uint64, 0, len(in))
	for i := range in {
		v, err := strconv.ParseUint(in[i], 10, 64)
		if err != nil {
			return err
		}
		out = append(out, v)
	}

	*c = out
	return nil
}

type PrivateSeed struct {
	Player       BinaryAddress `json:"player"`
	Subkey       BinaryAddress `json:"subkey"`
	Signature    Signature     `json:"signature"`
	HeroAbility  *string       `json:"heroAbility"`
	Prisms       []Prism       `json:"prisms"`
	Cards        Cards         `json:"cards"`
	RandomSeed   RandomSeed    `json:"randomSeed"`
	CardRarities CardRarities  `json:"cardRarities"`
}

func (p *PrivateSeed) MarshalJSON() ([]byte, error) {
	p.HeroAbility = nil
	if ability := heroAbilities[PrismsToDeckClass(p.Prisms)]; ability != "" {
		p.HeroAbility = &ability
	}
	return json.Marshal(*p)
}

func NewPrivateSeedWithKeys(wallet *ethwallet.Wallet, subkey *ethwallet.Wallet) (*PrivateSeed, error) {
	certificationSignature, err := SignTypedMessage(wallet, subkey)
	if err != nil {
		return nil, fmt.Errorf("SignMessage: %w", err)
	}

	randomBuf := make([]uint8, 16)
	if _, err := cryptorand.Read(randomBuf); err != nil {
		return nil, fmt.Errorf("failed to generate random seed: %w", err)
	}
	randomSeed := [16]uint8{}
	copy(randomSeed[:], randomBuf)

	privateSeed := PrivateSeed{
		Player:       BinaryAddress(strings.ToLower(wallet.Address().Hex())),
		Subkey:       BinaryAddress(strings.ToLower(subkey.Address().Hex())),
		Signature:    certificationSignature,
		RandomSeed:   RandomSeed(randomSeed),
		CardRarities: CardRarities{},
		Cards:        []uint64{},
	}

	return &privateSeed, nil
}

func NewSubkeyProof(address *ethwallet.Wallet, subkey *ethwallet.Wallet) *ethcoder.TypedData {
	primaryType := "Authorize"
	return &ethcoder.TypedData{
		PrimaryType: primaryType,
		Types: ethcoder.TypedDataTypes{
			primaryType: {
				{Name: "message", Type: "string"},
				{Name: "address", Type: "address"},
				{Name: "subkey", Type: "address"},
			},
			"EIP712Domain": {
				{Name: "name", Type: "string"},
				{Name: "version", Type: "string"},
			},
		},
		Domain: ethcoder.TypedDataDomain{
			Name:    "OpenSky",
			Version: "1",
		},
		Message: map[string]interface{}{
			"message": "Authorize this device to play OpenSky games.",
			"address": common.HexToAddress(address.Address().Hex()),
			"subkey":  common.HexToAddress(subkey.Address().Hex()),
		},
	}
}

func SignTypedMessage(wallet *ethwallet.Wallet, subkey *ethwallet.Wallet) ([]byte, error) {
	// This is almost like SignMessage but not quite, it's exactly the same thing
	// the matchmaker.v1 generates but I'm not quite sure if it's right or where
	// does this come from. I wrote it by inspecting and comparing the
	// _signTypedData method of ethers-io/ethers.js with ethkit and ethcoder.

	proof := NewSubkeyProof(wallet, subkey)

	hash, err := proof.EncodeDigest()
	if err != nil {
		return nil, fmt.Errorf("EncodeDigest: %w", err)
	}

	signed, err := crypto.Sign(hash, wallet.PrivateKey())
	if err != nil {
		return nil, fmt.Errorf("Sign: %w", err)
	}

	// TODO: ethers.js seems to have a different treatment for this byte:
	// https://github.com/ethers-io/ethers.js/blob/bcda16df1d98b92af824026f8c3a0dfe5ebbf35d/packages/bytes/lib/index.js#L289
	signed[64] += 27

	return signed, nil
}
