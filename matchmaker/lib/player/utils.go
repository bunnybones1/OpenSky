package player

import (
	"regexp"
	"strconv"

	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/horizon-games/OpenSky/api/proto"
)

var reIsRandomDeckString = regexp.MustCompile(
	`^` + deckstring.SW_PREFIX + `[A-Z]{` + strconv.Itoa(deckstring.CLASS_LEN) + `}` + deckstring.VERSION + `$`,
)

func isRandomDeckString(deckString *string) bool {
	if deckString == nil || *deckString == "" {
		return false
	}

	if reIsRandomDeckString.MatchString(*deckString) {
		return true
	}

	return false
}

func PrismsToDeckClass(prisms []Prism) proto.DeckClass {
	if len(prisms) < 1 {
		return proto.DeckClass_UNKNOWN_CLASS
	}
	deckClass := prisms[0].String()
	if len(prisms) == 2 && len(prisms[0].String()) > 1 && len(prisms[1].String()) > 0 {
		deckClass = prisms[0].String()[:2] + prisms[1].String()[:1]
	}
	return proto.DeckClass(proto.DeckClass_value[deckClass])
}
