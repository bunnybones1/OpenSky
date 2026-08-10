package data

import (
	"fmt"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/scylladb/go-set/u64set"
	"github.com/upper/db/v4"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"

	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	// NOTE: If you change these, change the ones in `shared/src/constants.ts` too.
	SinglePrismDeckSize = 30
	DualPrismDeckSize   = 30

	StarterDeck_STR = "SWxSTR0224gSjisS9WiYTUwzdwyc7xYgw9eR2us1aSrgBNHNAnSpFH8P7Sb4RdUXCD8c7FjHgbLwCJXttb1C7upZe7"
	StarterDeck_AGI = "SWxAGY024CAxrwfsrA9eYhhNyQi9pLjFcmGceZxi9zK3oQUVNZFNg42TuUXzo6irh9u49sBQP844boVSuuixb8WA6f"
	StarterDeck_WIS = "SWxWIS02nCENV54aRu9uTosF6Tei62TFXoS481AMhWfBPZaqsXSZuDWLoyrXoZsEct8XSBDhWnT8R74VoXARLx3Sns"
	StarterDeck_HRT = "SWxHRT02dWkxwmpWSaJL6tFSNjLUNFYvxNt9Xsfcy6D6AFdETPMg1PQhyuKew86KfKJP7hJqbZrcApx1FfMkBVmCyq"
	StarterDeck_INT = "SWxINT02e3kzYSxdTHe1948dHZ9g8ieNZm4U8jXhhn29WdfXYn7XbG7QDiXu1bBGyWa79M2fTH1g1k5vYkgPrU4YNj"
)

var (
	starterDecks = map[proto.DeckClass][]uint64{}

	ErrHeroUnlockedAlready = fmt.Errorf("hero is unlocked already")
)

func init() {
	cardIDs, _, _, err := deckstring.Decode(StarterDeck_STR)
	if err == nil {
		starterDecks[proto.DeckClass_STR] = cardIDs
	}

	cardIDs, _, _, err = deckstring.Decode(StarterDeck_AGI)
	if err == nil {
		starterDecks[proto.DeckClass_AGY] = cardIDs
	}

	cardIDs, _, _, err = deckstring.Decode(StarterDeck_WIS)
	if err == nil {
		starterDecks[proto.DeckClass_WIS] = cardIDs
	}

	cardIDs, _, _, err = deckstring.Decode(StarterDeck_HRT)
	if err == nil {
		starterDecks[proto.DeckClass_HRT] = cardIDs
	}

	cardIDs, _, _, err = deckstring.Decode(StarterDeck_INT)
	if err == nil {
		starterDecks[proto.DeckClass_INT] = cardIDs
	}
}

// Deck represents a single deck.
type Deck struct {
	*proto.Deck
}

func (d *Deck) Store(sess db.Session) db.Store {
	return DB.Decks(sess)
}

func (d *Deck) IsComplete() bool {
	if d.Class == proto.DeckClass_AGY ||
		d.Class == proto.DeckClass_HRT ||
		d.Class == proto.DeckClass_INT ||
		d.Class == proto.DeckClass_STR ||
		d.Class == proto.DeckClass_WIS {
		return len(d.CardIDs) == SinglePrismDeckSize
	}
	return len(d.CardIDs) == DualPrismDeckSize
}

// NewDeck returns a new deck.
func NewDeck() *Deck {
	return &Deck{Deck: &proto.Deck{}}
}

// Decodes deck string into a deck. Performs NO VALIDATION - trust the string
func DeckFromDeckString(deckString string) (*Deck, error) {
	cardIDs, class, _, err := deckstring.Decode(deckString)
	if err != nil {
		return nil, err
	}

	// DeckClass proto value
	v, ok := proto.DeckClass_value[class]
	if !ok {
		return nil, errors.Errorf("deck class '%s' is unknown", class)
	}
	deckClass := proto.DeckClass(v)

	return &Deck{
		Deck: &proto.Deck{
			Name:       "",
			Class:      deckClass,
			CardIDs:    cardIDs,
			DeckString: deckString,
		},
	}, nil
}

// Remove deleted/inactive cards
func (d *Deck) RemoveInvalidCards() bool {
	cardCount := len(d.CardIDs)
	d.CardIDs = CardIndex.RemoveInvalidIDs(d.CardIDs)

	return cardCount == len(d.CardIDs)
}

// Set deck class based on cards if possible
func (d *Deck) InferClass() error {
	cardClasses := map[proto.CardClass]struct{}{}

	for _, id := range d.CardIDs {
		card, ok := CardIndex.IDIndex[id]
		if !ok {
			continue
		}
		cardClasses[card.Class] = struct{}{}
	}

	// Make list of classes detected
	classes := []proto.CardClass{}
	for k := range cardClasses {
		classes = append(classes, k)
	}

	switch len(classes) {
	case 0:
		return nil

	case 1:
		newClass := DeckClassFromCardClasses(classes...)
		if !EqualOrSubclass(d.Class, newClass) {
			d.Class = newClass
		}
		return nil

	case 2:
		d.Class = DeckClassFromCardClasses(classes...)
		return nil

	default:
		return errors.Errorf("detected %d classes in your card list, but only single-class or dual-class decks are allowed", len(cardClasses))
	}
}

// Remove smallest number of cards possible to reduce number of classes to 2
func (d *Deck) ForceValidClass() bool {
	cardClasses := map[proto.CardClass]int{}
	removed := false

	for _, id := range d.CardIDs {
		card, ok := CardIndex.IDIndex[id]
		if !ok {
			continue
		}

		if _, ok = cardClasses[card.Class]; !ok {
			cardClasses[card.Class] = 0
		}
		cardClasses[card.Class]++
	}

	for i := len(cardClasses); i > 2; i-- {
		removed = true
		// find class with smallest number of cards
		var excludeClass proto.CardClass
		var cardNo int = 1000

		for c, no := range cardClasses {
			if cardNo > no {
				excludeClass = c
				cardNo = no
			}
		}

		// remove cards of that class
		var newCardIDs []uint64
		for _, id := range d.CardIDs {
			card, ok := CardIndex.IDIndex[id]
			if !ok {
				continue
			}
			if card.Class == excludeClass {
				continue
			}

			newCardIDs = append(newCardIDs, id)
		}
		d.CardIDs = newCardIDs
		delete(cardClasses, excludeClass)
	}

	if err := d.InferClass(); err != nil {
		log.Err(err).Msg("infer class")
	}

	return removed
}
func NewDeckByDeckString(name, deckString string) (*Deck, error) {
	cardIDs, deckClass, _, err := DecodeDeckString(deckString)
	if err != nil {
		return nil, err
	}
	return NewDeckByCardIDs(name, deckClass, cardIDs)
}

func NewDeckByCardIDs(name string, deckClass proto.DeckClass, cardIDs []uint64) (*Deck, error) {
	// Verify card list
	err := CardIndex.VerifyIDs(cardIDs)
	if err != nil {
		return nil, err
	}

	// Detect deck class for the cards list
	cardDeckClass, _, err := GetDeckClassFromCardIDs(cardIDs)
	if err != nil {
		return nil, err
	}

	if deckClass == proto.DeckClass_UNKNOWN_CLASS {
		deckClass = cardDeckClass
	}

	if !EqualOrSubclass(deckClass, cardDeckClass) {
		return nil, errors.New("invalid class")
	}

	// Parse + verify deck string, and get deck class
	deckString, err := EncodeDeckString(cardIDs, deckClass)
	if err != nil {
		return nil, err
	}

	// Create deck object
	deck := NewDeck()
	deck.Name = name
	deck.DeckString = deckString
	deck.Class = deckClass
	deck.CardIDs = cardIDs

	return deck, nil
}

// Validate returns an error if the deck does not pass validation rules.
func (d *Deck) Validate() error {
	if !d.AccountID.IsValid() {
		return errors.New("a deck must have an account ID")
	}
	if len(d.Name) == 0 {
		return errors.New("a deck must have a name")
	}
	if d.DeckString == "" {
		return errors.New("invalid deck string")
	}
	if d.Class == proto.DeckClass_UNKNOWN_CLASS {
		return errors.New("invalid deck class")
	}

	if len(d.CardIDs) == 0 {
		cardIDs, deckClass, _, err := DecodeDeckString(d.DeckString)
		if err != nil {
			return err
		}
		if d.Class != deckClass {
			return errors.New("deck record does not match deck string class")
		}
		d.CardIDs = cardIDs
	}

	switch d.Class {
	case proto.DeckClass_STH,
		proto.DeckClass_STA,
		proto.DeckClass_STI,
		proto.DeckClass_STW,
		proto.DeckClass_HRA,
		proto.DeckClass_HRI,
		proto.DeckClass_HRW,
		proto.DeckClass_AGI,
		proto.DeckClass_AGW,
		proto.DeckClass_INW:
		if len(d.CardIDs) > DualPrismDeckSize {
			return errors.Errorf("wrong number of cards (%d) for dual-class deck, must be %d.", len(d.CardIDs), DualPrismDeckSize)
		}

	default:
		if len(d.CardIDs) > SinglePrismDeckSize {
			return errors.Errorf("wrong number of cards (%d) for single-class deck, must be %d.", len(d.CardIDs), SinglePrismDeckSize)
		}
	}

	return nil
}

func (d *Deck) CardsFromDeckString() []*Card {
	cards, _ := CardIndex.GetCardsByDeckString(d.DeckString)
	return cards
}

func DeckClassFromCardClasses(classes ...proto.CardClass) proto.DeckClass {
	var _str, _hrt, _agy, _int, _wis bool

	switch len(classes) {
	case 1, 2:
		for _, class := range classes {
			switch class {
			case proto.CardClass_AGY:
				_agy = true

			case proto.CardClass_HRT:
				_hrt = true

			case proto.CardClass_INT:
				_int = true

			case proto.CardClass_STR:
				_str = true

			case proto.CardClass_WIS:
				_wis = true
			}
		}
	default:
		return 0
	}

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
	case _int:
		return proto.DeckClass_INT // 4
	case _str:
		return proto.DeckClass_STR // 1
	case _wis:
		return proto.DeckClass_WIS // 5
	case _hrt:
		return proto.DeckClass_HRT // 2
	case _agy:
		return proto.DeckClass_AGY // 3
	}

	return 0
}

// Merge returns a new deck by merging some fields of the current deck with the
// given update.
func (d *Deck) Merge(u *proto.Deck) *Deck {
	v := *d
	if u.DeckString != "" {
		v.DeckString = u.DeckString
	}
	if len(u.CardIDs) > 0 {
		v.CardIDs = u.CardIDs
	}
	if u.Name != "" {
		v.Name = u.Name
	}
	if u.Class == proto.DeckClass_UNKNOWN_CLASS {
		v.Class = u.Class
	}
	if u.Art != "" {
		v.Art = u.Art
	}

	return &v
}

// BeforeCreate satisfies db.BeforeCreateHook.
func (d *Deck) BeforeCreate(sess db.Session) error {
	if err := d.beforeSave(sess); err != nil {
		return err
	}
	return nil
}

// BeforeUpdate satisfies db.BeforeUpdateHook.
func (d *Deck) BeforeUpdate(sess db.Session) error {
	if err := d.beforeSave(sess); err != nil {
		return err
	}

	d.UpdatedAt = TimeNowUTCPtr()

	return nil
}

func (d *Deck) AfterCreate(sess db.Session) error {
	if err := d.afterSave(sess); err != nil {
		return err
	}
	return nil
}

func (d *Deck) AfterUpdate(sess db.Session) error {
	if err := d.afterSave(sess); err != nil {
		return err
	}
	return nil
}

func (d *Deck) beforeSave(_ db.Session) error {
	cardIDs, _, _, err := DecodeDeckString(d.DeckString)
	if err != nil {
		return err
	}
	d.CardIDs = cardIDs

	return nil
}

func (d *Deck) afterSave(sess db.Session) error {
	if !d.IsComplete() {
		return nil
	}

	ok, err := DB.DeckRanks(sess).FindCurrent(db.Cond{"deck_string": d.DeckString}).Exists()
	if err != nil {
		return err
	}

	if ok {
		return nil
	}

	err = sess.Save(&DeckRank{DeckRank: &proto.DeckRank{
		DeckString:      d.DeckString,
		CardIDs:         d.CardIDs,
		HighestPlayerID: d.AccountID,
	}})
	return err
}

var (
	_ interface {
		db.Record
		db.Validator
		db.BeforeCreateHook
		db.BeforeUpdateHook
	} = &Deck{}
)

func CreateStarterDecks(sess db.Session, accountID proto.AccountID) error {
	decks := GetStarterDecks()

	var existingDecks []*proto.Deck

	err := DB.Decks(sess).Find(db.Cond{
		"account_id": accountID,
		"deck_type":  db.In(proto.DeckType_LOCKED_STARTER, proto.DeckType_UNLOCKED_STARTER),
	}).All(&existingDecks)
	if err != nil {
		return fmt.Errorf("find decks: %w", err)
	}

	existingDeckMap := make(map[proto.DeckClass]bool)
	for _, d := range existingDecks {
		existingDeckMap[d.Class] = true
	}

	for _, d := range decks {
		if existingDeckMap[d.Class] {
			continue
		}

		d.AccountID = accountID
		d.DeckString, _ = EncodeDeckString(d.CardIDs, d.Class)

		if err := sess.Save(&Deck{Deck: d}); err != nil {
			return fmt.Errorf("save deck: %w", err)
		}

		if d.DeckType == proto.DeckType_UNLOCKED_STARTER {
			_, _, err = UnlockStarterDeckByDeckClass(sess, accountID, d.Class)
			if err != nil {
				return fmt.Errorf("unlock starter deck: %w", err)
			}
		}
	}

	return nil
}

func UnlockStarterDecksByLevel(sess db.Session, accountID proto.AccountID, level int) (events []*proto.FeedEvent, rewards []*proto.Reward, err error) {
	heroes, err := ListHeroesInLevel(sess, uint16(level))
	if err != nil {
		return nil, nil, fmt.Errorf("list heroes in level: %w", err)
	}

	if len(heroes) == 0 {
		return nil, nil, nil
	}

	for _, hero := range heroes {
		deckClass := HeroDeckClass(hero)

		newEvents, newRewards, err := UnlockStarterDeckByDeckClass(sess, accountID, deckClass)
		if err != nil {
			return nil, nil, fmt.Errorf("unlock starter deck by deck class: %w", err)
		}

		events = append(events, newEvents...)
		rewards = append(rewards, newRewards...)
	}

	return events, rewards, nil
}

func UnlockStarterDeckByDeckClass(sess db.Session, accountID proto.AccountID, deckClass proto.DeckClass) (events []*proto.FeedEvent, rewards []*proto.Reward, err error) {
	tokenIDs := u64set.New()

	hero := DeckClassHero(deckClass)

	var deck *Deck

	// Ada is unlocked on account creation.
	if hero == proto.Hero_ADA {
		deck, err = DB.Decks(sess).FindOne(db.Cond{
			"account_id": accountID,
			"deck_type":  db.In(proto.DeckType_UNLOCKED_STARTER),
			"class":      HeroDeckClass(hero),
		})
	} else {
		deck, err = DB.Decks(sess).FindOne(db.Cond{
			"account_id": accountID,
			"deck_type":  db.In(proto.DeckType_LOCKED_STARTER),
			"class":      HeroDeckClass(hero),
		})
	}

	if err != nil {
		if err == db.ErrNoMoreRows {
			// deck already unlocked
			return nil, nil, nil
		}

		return nil, nil, fmt.Errorf("find deck: %w", err)
	}

	// Set deck as unlocked
	deck.DeckType = proto.DeckType_UNLOCKED_STARTER

	// Set as new
	deck.IsNew = true

	if err := sess.Save(deck); err != nil {
		return nil, nil, fmt.Errorf("save deck: %w", err)
	}

	tokenIDs.Add(deck.CardIDs...)

	events = append(events, &proto.FeedEvent{
		AccountID: accountID,
		Type:      proto.FeedEventType_STARTED_DECK_UNLOCK,
		Heroes:    []proto.Hero{hero},
	})

	rewards = append(rewards, &proto.Reward{
		AccountID: accountID,
		Type:      proto.RewardType_DECK,
		Deck: &proto.RewardDeck{
			DeckClass: HeroDeckClass(hero),
			TokenIds:  deck.CardIDs,
		},
	})

	if !tokenIDs.IsEmpty() {
		var newCardTokenIDs []uint64

		itemType := proto.ItemType_SW_BASE_CARDS

		for _, token := range tokenIDs.List() {
			existingBaseItem, err := DB.Items(sess).FindAccountItem(accountID, proto.ItemType_SW_BASE_CARDS, token)
			if err != nil && err != db.ErrNoMoreRows {
				return nil, nil, fmt.Errorf("find item: %w", err)
			}

			if existingBaseItem != nil {
				// skip reward, as they already have this card and we don't issue multiple base copies
				continue
			}

			accountCard := &Item{Item: &proto.Item{
				AccountID: accountID,
				ItemType:  itemType,
				TokenID:   token,
				Balance:   prototyp.NewBigInt(1),
			}}

			if err := sess.Save(accountCard); err != nil {
				return nil, nil, fmt.Errorf("save item: %w", err)
			}

			newCardTokenIDs = append(newCardTokenIDs, accountCard.TokenID)
		}

		if len(newCardTokenIDs) > 0 {
			if err := DB.Items(sess).MarkNotNew(accountID, itemType, newCardTokenIDs...); err != nil {
				return nil, nil, fmt.Errorf("mark cards as not new: %w", err)
			}
		}
	}

	return events, rewards, nil
}

func UnlockHero(sess db.Session, accountID proto.AccountID, hero proto.Hero) error {
	// First, lets check the items inventory of a player if they already have
	// the hero, if so, we don't create a new hero for them
	existingBaseItem, err := DB.Items(sess).FindAccountItem(accountID, proto.ItemType_SW_HERO, uint64(hero))
	if err != nil && err != db.ErrNoMoreRows {
		return errors.Wrap(err, "fetching hero ownership in db failed")
	}

	if existingBaseItem != nil {
		return ErrHeroUnlockedAlready
	}

	accountHero := &Item{Item: &proto.Item{
		AccountID: accountID,
		ItemType:  proto.ItemType_SW_HERO,
		Balance:   prototyp.NewBigInt(1),
		TokenID:   uint64(hero),
	}}

	if err := sess.Save(accountHero); err != nil {
		return errors.Wrap(err, "saving earned hero in db failed")
	}

	return nil
}

func IsDeckClassUnlocked(sess db.Session, accountID proto.AccountID, deckClass proto.DeckClass) (bool, error) {
	hero := DeckClassHero(deckClass)

	if hero == proto.Hero_ADA {
		return true, nil
	}

	item, err := DB.Items(sess).FindAccountItem(accountID, proto.ItemType_SW_HERO, uint64(hero))
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return false, fmt.Errorf("find hero in items: %w", err)
	}

	if item == nil || errors.Is(err, db.ErrNoMoreRows) {
		return false, nil
	}

	return true, nil
}

func DeckClassUnlockLevels(sess db.Session) (map[string]uint16, error) {
	listHeroes, err := ListHeroesByLevel(sess)
	if err != nil {
		return nil, fmt.Errorf("list heroes by level: %w", err)
	}

	unlocks := make(map[string]uint16)
	for level, heroes := range listHeroes {
		for _, hero := range heroes {
			unlocks[HeroDeckClass(hero).String()] = level
		}
	}

	return unlocks, nil
}

func GetStarterDecks() []*proto.Deck {
	var decks []*proto.Deck

	caser := cases.Title(language.English)

	for deckClass, cardList := range starterDecks {
		// Unlock STR starter deck on account creation.
		var deckType proto.DeckType
		if deckClass == proto.DeckClass_STR {
			deckType = proto.DeckType_UNLOCKED_STARTER
		} else {
			deckType = proto.DeckType_LOCKED_STARTER
		}

		hero := DeckClassHero(deckClass)

		decks = append(decks, &proto.Deck{
			Name:     fmt.Sprintf("%s Starter", caser.String(hero.String())),
			Class:    deckClass,
			CardIDs:  cardList,
			DeckType: deckType,
		})
	}

	return decks
}

func HasStarterDeck(deckClass proto.DeckClass) bool {
	if _, ok := starterDecks[deckClass]; ok {
		return true
	}

	return false
}
