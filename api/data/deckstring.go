package data

import (
	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/pkg/errors"
)

func EncodeDeckString(cardIDs []uint64, deckClass proto.DeckClass) (string, error) {
	// Verify cardIDs are valid
	err := CardIndex.VerifyIDs(cardIDs)
	if err != nil {
		return "", errors.Wrapf(err, "invalid deck")
	}

	// Detect deck class for the cards list
	cardDeckClass, _, err := GetDeckClassFromCardIDs(cardIDs)
	if err != nil {
		return "", err
	}

	if !EqualOrSubclass(deckClass, cardDeckClass) {
		return "", errors.New("invalid class")
	}

	// Encode it up!
	return deckstring.Encode(cardIDs, deckClass.String())
}

// returns: cardIDs, deckClass, encoding version, error
func DecodeDeckString(deckString string) ([]uint64, proto.DeckClass, string, error) {
	cardIDs, sdeckClass, ver, err := deckstring.Decode(deckString)
	if err != nil {
		return nil, 0, ver, err
	}

	if ver != deckstring.VERSION {
		return nil, 0, ver, errors.Errorf("invalid version")
	}

	// DeckClass proto value
	v, ok := proto.DeckClass_value[sdeckClass]
	if !ok {
		return nil, 0, ver, errors.Errorf("deck class '%s' is unknown", sdeckClass)
	}
	deckClass := proto.DeckClass(v)

	// Verify cardIDs are valid
	err = CardIndex.VerifyIDs(cardIDs)
	if err != nil {
		return nil, deckClass, ver, errors.Wrapf(err, "invalid deck")
	}

	if len(cardIDs) == 0 {
		return cardIDs, deckClass, ver, nil
	}

	// Verify deck class
	cardsDeckClass, _, err := GetDeckClassFromCardIDs(cardIDs)
	if err != nil {
		return nil, deckClass, ver, err
	}
	if !EqualOrSubclass(deckClass, cardsDeckClass) {
		return nil, deckClass, ver, errors.Errorf("decoded deck class %s but cards need %s", sdeckClass, cardsDeckClass.String())
	}

	return cardIDs, deckClass, ver, nil
}

// GetDeckClassFromCardIDs will infer the deck class for the card list or return
// an error if one is invalid or unknown.
func GetDeckClassFromCardIDs(cardIDs []uint64) (proto.DeckClass, int, error) {
	// ensure all are part of either single or dual class deck,
	// and return the inferred deck classname
	cardClasses := map[proto.DeckClass]struct{}{}

	for _, id := range cardIDs {
		card, ok := CardIndex.IDIndex[id]
		if !ok {
			return 0, 0, errors.Errorf("card id %d is invalid", id)
		}

		switch card.Class {
		case proto.CardClass_AGY:
			cardClasses[proto.DeckClass_AGY] = struct{}{}

		case proto.CardClass_HRT:
			cardClasses[proto.DeckClass_HRT] = struct{}{}

		case proto.CardClass_INT:
			cardClasses[proto.DeckClass_INT] = struct{}{}

		case proto.CardClass_STR:
			cardClasses[proto.DeckClass_STR] = struct{}{}

		case proto.CardClass_WIS:
			cardClasses[proto.DeckClass_WIS] = struct{}{}
		}
	}

	// Make list of classes detected
	classes := []proto.DeckClass{}
	for k := range cardClasses {
		classes = append(classes, k)
	}

	switch len(classes) {
	case 1:
		// Return single-class
		// NOTE: we do not restrict deck size here, as deck size for a single class is
		// enforced by the game mode
		return classes[0], len(classes), nil

	case 2:
		// Return dual-class
		// NOTE: we do not restrict deck size here, as deck size for a single class is
		// enforced by the game mode
		dualDeck := getDualDeckClassByPair(classes[0], classes[1])
		if dualDeck == 0 {
			return 0, 0, errors.Errorf("cannot infer dual deck class by classes %d and %d", classes[0], classes[1])
		}
		return dualDeck, len(classes), nil

	default:
		return 0, 0, errors.Errorf("detected %d classes in your card list, but only single-class or dual-class decks are allowed", len(classes))
	}
}

func getDualDeckClassByPair(class1, class2 proto.DeckClass) proto.DeckClass {
	_str := proto.DeckClass_STR == class1 || proto.DeckClass_STR == class2
	_hrt := proto.DeckClass_HRT == class1 || proto.DeckClass_HRT == class2
	_agy := proto.DeckClass_AGY == class1 || proto.DeckClass_AGY == class2
	_int := proto.DeckClass_INT == class1 || proto.DeckClass_INT == class2
	_wis := proto.DeckClass_WIS == class1 || proto.DeckClass_WIS == class2

	switch {
	case _str && _hrt:
		return proto.DeckClass_STH // 6
	case _str && _agy:
		return proto.DeckClass_STA // 7
	case _str && _int:
		return proto.DeckClass_STI // 8
	case _str && _wis:
		return proto.DeckClass_STW // 9
	case _hrt && _agy:
		return proto.DeckClass_HRA // 10
	case _hrt && _int:
		return proto.DeckClass_HRI // 11
	case _hrt && _wis:
		return proto.DeckClass_HRW // 12
	case _agy && _int:
		return proto.DeckClass_AGI // 13
	case _agy && _wis:
		return proto.DeckClass_AGW // 14
	case _int && _wis:
		return proto.DeckClass_INW // 15
	}

	return 0
}

func EqualOrSubclass(class1, class2 proto.DeckClass) bool {
	if class1 == class2 {
		return true
	}

	switch class1 {
	case proto.DeckClass_STH:
		return class2 == proto.DeckClass_STR || class2 == proto.DeckClass_HRT

	case proto.DeckClass_STA:
		return class2 == proto.DeckClass_STR || class2 == proto.DeckClass_AGY

	case proto.DeckClass_STI:
		return class2 == proto.DeckClass_STR || class2 == proto.DeckClass_INT

	case proto.DeckClass_STW:
		return class2 == proto.DeckClass_STR || class2 == proto.DeckClass_WIS

	case proto.DeckClass_HRA:
		return class2 == proto.DeckClass_HRT || class2 == proto.DeckClass_AGY

	case proto.DeckClass_HRI:
		return class2 == proto.DeckClass_HRT || class2 == proto.DeckClass_INT

	case proto.DeckClass_HRW:
		return class2 == proto.DeckClass_HRT || class2 == proto.DeckClass_WIS

	case proto.DeckClass_AGI:
		return class2 == proto.DeckClass_AGY || class2 == proto.DeckClass_INT

	case proto.DeckClass_AGW:
		return class2 == proto.DeckClass_AGY || class2 == proto.DeckClass_WIS

	case proto.DeckClass_INW:
		return class2 == proto.DeckClass_INT || class2 == proto.DeckClass_WIS
	}

	return false
}
