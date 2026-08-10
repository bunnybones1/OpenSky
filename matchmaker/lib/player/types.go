package player

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"
	"github.com/0xsequence/go-sequence/lib/prototyp"

	"github.com/horizon-games/OpenSky/api/proto"
)

// TODO: Several types in this file are duplicated and should be using proto generated
// files instead to avoid debt (e.g. Account type defined below is outdated)

const (
	customJSONMapType = "Map"
)

type RandomSeed [16]uint8

type Prism proto.CardClass

func (p Prism) String() string {
	return proto.CardClass(p).String()
}

func (p *Prism) MarshalJSON() ([]byte, error) {
	value := strings.ToLower(p.String())
	return json.Marshal(value)
}

func (p *Prism) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	value := strings.ToUpper(s)
	cardClassValue, ok := proto.CardClass_value[value]
	if !ok {
		return fmt.Errorf("invalid value %q", s)
	}

	*p = Prism(proto.CardClass(cardClassValue))

	return nil
}

type Rarity string

const (
	Rarity_BASE   Rarity = "base"
	Rarity_SILVER Rarity = "silver"
	Rarity_GOLD   Rarity = "gold"
)

func (r *Rarity) UnmarshalText(text []byte) error {
	v := Rarity(text)
	switch v {
	case Rarity_BASE, Rarity_SILVER, Rarity_GOLD:
		*r = v
		return nil
	}
	return fmt.Errorf("invalid rarity %q", string(text))
}

type Signature []uint8

func (s Signature) MarshalJSON() ([]byte, error) {
	buf := []uint{}
	for _, c := range s {
		buf = append(buf, uint(c))
	}
	return json.Marshal(buf)
}

type AccountWithItems struct {
	*proto.Account

	DeckString     string          `json:"deckString,omitempty"`
	InitDeckString string          `json:"initDeckString,omitempty"`
	DeckClass      proto.DeckClass `json:"deckClass,omitempty"`

	Cards         CardRarities         `json:"cards,omitempty"`
	Prisms        []Prism              `json:"prisms"`
	DeckEquipment *proto.DeckEquipment `json:"deckEquipment"`
}

func NewAccountWithItems(account *proto.Account) *AccountWithItems {
	return &AccountWithItems{
		Account: account,

		Cards:  CardRarities{},
		Prisms: []Prism{},
	}
}

type customJSONMap struct {
	DataType string     `json:"dataType"`
	Value    [][]string `json:"value"`
}

type BinaryAddress prototyp.Hash

func (addr *BinaryAddress) UnmarshalJSON(data []byte) error {
	var buf []byte
	if err := json.Unmarshal(data, &buf); err != nil {
		return err
	}
	hash := prototyp.HashFromBytes(buf)
	*addr = BinaryAddress(string(hash))
	return nil
}

func (addr BinaryAddress) MarshalJSON() ([]byte, error) {
	dec, err := hexutil.Decode(string(addr))
	if err != nil {
		return nil, err
	}
	buf := []uint{}
	for _, c := range dec {
		buf = append(buf, uint(c))
	}
	return json.Marshal(buf)
}

func (addr BinaryAddress) String() string {
	return strings.ToLower(string(addr))
}

type CardRarities map[uint64]Rarity

func (c *CardRarities) UnmarshalJSON(buf []byte) error {
	value := customJSONMap{}
	if err := json.Unmarshal(buf, &value); err != nil {
		return err
	}

	if value.DataType == "" {
		return nil
	}

	*c = CardRarities{}
	if value.DataType != customJSONMapType {
		return errors.New(`expecting type "` + customJSONMapType + `"`)
	}

	for _, value := range value.Value {
		var r Rarity
		err := r.UnmarshalText([]byte(value[1]))
		if err != nil {
			return err
		}
		cardID, err := strconv.ParseUint(value[0], 10, 64)
		if err != nil {
			return err
		}
		(*c)[cardID] = r
	}

	return nil
}

func (c CardRarities) MarshalJSON() ([]byte, error) {
	if c == nil {
		return []byte("{}"), nil
	}
	values := make([][]string, 0, len(c))
	for k := range c {
		values = append(values, []string{fmt.Sprintf("%d", k), string(c[k])})
	}

	buf, err := json.Marshal(customJSONMap{customJSONMapType, values})
	if err != nil {
		return nil, err
	}

	return buf, nil
}
