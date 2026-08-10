package deckstring

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"sort"
	"strings"

	"github.com/mr-tron/base58"
	"github.com/pkg/errors"
)

// DeckString
//
// Format: SWxCCCVVaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
//
// - SWx (3 bytes) is OpenSky constant prefix
// - CCC (3 bytes) for class prefix
// - VV  (last 2 bytes) is encoding scheme version
// - aa* (n bytes) for card encoding
//
// NOTE: this package is just the encoder/decoder, use data.EncodeDeckString
// and data.DecodeDeckString for versions that include verification of contents

const (
	SW_PREFIX     = "SWx"
	SW_PREFIX_LEN = 3

	VERSION     = "02"
	VERSION_LEN = 2

	CLASS_LEN = 3
)

// Encode will generate a OpenSky deck string unique encoding based on the supplied
// cardIDs array and deckClass string.
func Encode(cardIDs []uint64, deckClass string) (string, error) {
	// Sort the ids so encoded strings are consistently the same
	sort.Sort(UInt64Slice(cardIDs))

	// deckClass must be up-cased
	deckClass = strings.ToUpper(deckClass)

	// Let the encoding begin
	buf := new(bytes.Buffer)
	for _, id := range cardIDs {
		err := binary.Write(buf, binary.LittleEndian, uint16(id))
		if err != nil {
			return "", errors.Errorf("failed to encode card id %d with %v", id, err)
		}
	}

	encodedCards := base58.Encode(buf.Bytes())

	ds := fmt.Sprintf("%s%s%s%s", SW_PREFIX, deckClass, VERSION, encodedCards)
	return ds, nil
}

// Decode will unpack a OpenSky deck string and return:
// cardIDs array, deck class, encoding version, and optional error
func Decode(deckString string) ([]uint64, string, string, error) {
	if len(deckString) < 8 {
		return nil, "", "", errors.Errorf("invalid, min length not met %s", deckString)
	}

	sw := deckString[:SW_PREFIX_LEN]
	class := deckString[SW_PREFIX_LEN : SW_PREFIX_LEN+CLASS_LEN]
	ver := deckString[SW_PREFIX_LEN+CLASS_LEN : SW_PREFIX_LEN+CLASS_LEN+VERSION_LEN]
	//cards := deckString[SW_PREFIX_LEN+CLASS_LEN+VERSION_LEN:]

	if sw != SW_PREFIX {
		return nil, class, ver, errors.Errorf("not a OpenSky deck")
	}

	switch ver {
	case VERSION01:
		return DecodeSW01(deckString)

	case VERSION:
		return DecodeSW02(deckString)

	default:
		return nil, class, ver, errors.Errorf("deckstring version '%s' not recognized", ver)
	}
}

func DecodeSW02(deckString string) ([]uint64, string, string, error) {
	if len(deckString) < 8 {
		return nil, "", "", errors.Errorf("invalid, min length not met %s", deckString)
	}

	class := deckString[SW_PREFIX_LEN : SW_PREFIX_LEN+CLASS_LEN]
	ver := deckString[SW_PREFIX_LEN+CLASS_LEN : SW_PREFIX_LEN+CLASS_LEN+VERSION_LEN]
	cards := deckString[SW_PREFIX_LEN+CLASS_LEN+VERSION_LEN:]

	if len(cards) == 0 {
		return []uint64{}, class, ver, nil
	}

	decoded, err := base58.Decode(cards)
	if err != nil {
		return nil, class, ver, errors.Wrapf(err, "unable to decode cards in deck")
	}

	cardIDs := make([]uint64, len(decoded)/2)

	for i := 0; i < len(decoded)/2; i++ {
		id := binary.LittleEndian.Uint16(decoded[2*i : 2*i+2])
		cardIDs[i] = uint64(id)
	}

	return cardIDs, class, ver, nil
}

type UInt64Slice []uint64

func (p UInt64Slice) Len() int           { return len(p) }
func (p UInt64Slice) Less(i, j int) bool { return p[i] < p[j] }
func (p UInt64Slice) Swap(i, j int)      { p[i], p[j] = p[j], p[i] }
func (p UInt64Slice) Sort()              { sort.Sort(p) }
