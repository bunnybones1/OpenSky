package data

import (
	"fmt"
	"math/rand"
	"sync"

	"github.com/pkg/errors"
	"github.com/scylladb/go-set/u64set"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	CardIndex     = NewCardIndex()
	ActiveClasses = []proto.CardClass{
		proto.CardClass_AGY,
		proto.CardClass_HRT,
		proto.CardClass_STR,
		proto.CardClass_WIS,
		proto.CardClass_INT,
	}
	cardsRevision int32 = 0
)

type cardIndex struct {
	Num          int
	IDs          *u64set.Set
	Cards        []Card
	IDIndex      map[uint64]*Card
	mu           sync.Mutex
	imageBaseURL string
}

func NewCardIndex() *cardIndex {
	return &cardIndex{
		IDs:     u64set.New(),
		Cards:   []Card{},
		IDIndex: map[uint64]*Card{},
	}
}

func (m *cardIndex) Sync() error {
	// Sync cards from database to local cache
	var cards []Card

	err := DB.Cards(nil).Find(db.Cond{
		"status": proto.CardStatus_PLAY,
		"class":  db.AnyOf(ActiveClasses),
	}).OrderBy("id").All(&cards)
	if err != nil {
		return err
	}

	m.LoadCards(cards)

	row, err := DB.SQL().QueryRow(db.Raw("SELECT last_value FROM cards_revision_seq"))
	if err != nil {
		return err
	}

	if err = row.Scan(&cardsRevision); err != nil {
		return err
	}

	return nil
}

func (m *cardIndex) LoadCards(cards []Card) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.Num = 0
	m.IDs = u64set.New()
	m.Cards = []Card{}
	m.IDIndex = map[uint64]*Card{}

	for i := 0; i < len(cards); i++ {
		// NOTE: must use for with counter instead of range or
		// pointers will be screwed up below.
		card := cards[i]

		card.ImageURL = m.GetImageURL(card.ID)

		silverCardTokenID := ItemTypeAndID2SWTokenID(proto.ItemType_SW_SILVER_CARDS, card.ID)
		goldCardTokenID := ItemTypeAndID2SWTokenID(proto.ItemType_SW_GOLD_CARDS, card.ID)
		card.SilverCardTokenID = &silverCardTokenID
		card.GoldCardTokenID = &goldCardTokenID

		m.IDs.Add(card.ID)
		m.Cards = append(m.Cards, card)
		m.IDIndex[card.ID] = &card
	}

	m.Num = len(m.Cards)
}

func (m *cardIndex) AllCards() []Card {
	return m.Cards
}

func (m *cardIndex) AllCardIDs() []uint64 {
	return m.IDs.List()
}

func (m *cardIndex) GetCardByID(id uint64) *Card {
	card, ok := m.IDIndex[id]
	if !ok {
		return nil
	}

	return card
}

func (m *cardIndex) GetCardsByIDs(ids []uint64) []*Card {
	cards := make([]*Card, 0, len(ids))

	for _, id := range ids {
		card, ok := m.IDIndex[id]
		if ok {
			cards = append(cards, card)
		}
	}

	return cards
}

func (m *cardIndex) GetCardIDsByDeckString(deckString string) ([]uint64, error) {
	cardIDs, _, _, err := DecodeDeckString(deckString)
	if err != nil {
		return nil, err
	}

	return cardIDs, nil
}

func (m *cardIndex) GetCardsByDeckString(deckString string) ([]*Card, error) {
	cardIDs, _, _, err := DecodeDeckString(deckString)
	if err != nil {
		return nil, err
	}

	cards := m.GetCardsByIDs(cardIDs)
	if len(cards) != len(cardIDs) {
		return nil, errors.Errorf("invalid deck, missing cards")
	}

	return cards, nil
}

func (m *cardIndex) CardsByClasses(classes ...proto.CardClass) []Card {
	var cards []Card
	if len(classes) == 0 {
		return cards
	}

	for i, c := range m.Cards {
		for _, cl := range classes {
			if c.Class == cl {
				cards = append(cards, m.Cards[i])
			}
		}
	}

	return cards
}

func (m *cardIndex) CardIDsByClasses(classes ...proto.CardClass) []uint64 {
	var cardIDs []uint64
	if len(classes) == 0 {
		return cardIDs
	}

	for _, c := range m.Cards {
		for _, cl := range classes {
			if c.Class == cl {
				cardIDs = append(cardIDs, c.ID)
			}
		}
	}

	return cardIDs
}

func (m *cardIndex) CardIDsByCardSets(cardSets ...*proto.CardSet) []uint64 {
	var cardIDs []uint64

	if len(cardSets) == 0 {
		return cardIDs
	}

	for _, card := range m.Cards {
		for _, cardSet := range cardSets {
			if card.Set == *cardSet {
				cardIDs = append(cardIDs, card.ID)
			}
		}
	}

	return cardIDs
}

func (m *cardIndex) VerifyIDs(ids []uint64) error {
	// exist in index and that there are no dupes
	d := u64set.New(ids...)

	diff := u64set.Difference(d, m.IDs)
	if diff.Size() > 0 {
		return errors.Errorf("unknown card ids: %s", diff.String())
	}

	if d.Size() != len(ids) {
		return errors.Errorf("cannot have any duplicate ids")
	}

	return nil
}

func (m *cardIndex) GetRandomCard(excludeIDs []uint64) *Card {
	return m.GetRandomCardFromList(m.IDs, excludeIDs)
}

func (m *cardIndex) GetRandomCardFromList(pool *u64set.Set, excludeIDs []uint64) *Card {
	skipIDs := u64set.New(excludeIDs...)
	skipIDs.Add(m.CardIDsSeasonInvalid(CurrentSeason())...)
	allowedIDs := u64set.Difference(pool, skipIDs)

	if !allowedIDs.IsEmpty() {
		return m.getRandomCardFromListWithoutExclusion(allowedIDs)
	}

	// If none are allowed from the pool, pick from all.
	allowedIDs = u64set.Difference(m.IDs, skipIDs)
	if !allowedIDs.IsEmpty() {
		return m.getRandomCardFromListWithoutExclusion(allowedIDs)
	}

	// All cards are excluded.
	return nil
}

func (m *cardIndex) getRandomCardFromListWithoutExclusion(pool *u64set.Set) *Card {
	if pool == nil || pool.IsEmpty() {
		return nil
	}

	return m.GetCardByID(pool.List()[rand.Intn(pool.Size())])
}

func (m *cardIndex) GetRandomCardByClasses(classes []proto.CardClass, excludeIDs []uint64) *Card {
	var pool *u64set.Set

	if len(classes) == 0 {
		pool = m.IDs
	} else {
		pool = u64set.New(m.CardIDsByClasses(classes...)...)
	}

	return m.GetRandomCardFromList(pool, excludeIDs)
}

func (m *cardIndex) GetRandomCardByCardSets(sets []*proto.CardSet, excludeIDs []uint64) *Card {
	var pool *u64set.Set

	if len(sets) == 0 {
		pool = m.IDs
	} else {
		pool = u64set.New(m.CardIDsByCardSets(sets...)...)
	}

	return m.GetRandomCardFromList(pool, excludeIDs)
}

func (m *cardIndex) RemoveInvalidIDs(ids []uint64) []uint64 {
	return u64set.Intersection(m.IDs, u64set.New(ids...)).List()
}

func (m *cardIndex) SetImageBaseURL(cfg *config.Config) {
	m.imageBaseURL = cfg.OpenSky.ImageBaseURL

	if m.imageBaseURL == "" {
		switch cfg.Mode {
		case config.ProductionMode,
			config.StagingMode,
			config.DevelopmentMode:
			m.imageBaseURL = "https://assets.skyweaver.net/latest"
		default:
			// localhost
			m.imageBaseURL = "http://localhost:4001"
		}
	}
}

// GetImageURL returns structure with images for the given card's ID
func (m *cardIndex) GetImageURL(id uint64) *proto.CardImageURL {
	return &proto.CardImageURL{
		Small:  m.imageBaseURL + fmt.Sprintf("/full-cards/en/2x/%d.webp", id),
		Medium: m.imageBaseURL + fmt.Sprintf("/full-cards/en/4x/%d.webp", id),
		Large:  m.imageBaseURL + fmt.Sprintf("/full-cards/en/6x/%d.webp", id),
	}
}

func (m *cardIndex) CardIDsSeasonInvalid(season uint16) []uint64 {
	var ids []uint64

	for _, card := range m.Cards {
		if card.ValidFromSeason <= season {
			continue
		}

		ids = append(ids, card.ID)
	}

	return ids
}
