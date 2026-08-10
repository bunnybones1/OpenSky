package analytics

import (
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type CardData struct {
	CardId      uint64 `json:"cardId"`
	CardName    string `json:"cardName"`
	CardType    string `json:"cardType"`
	CardClass   string `json:"cardClass"`
	CardElement string `json:"cardElement"`
	CardMana    int32  `json:"cardMana"`
	CardAttack  uint32 `json:"cardAttack"`
	CardHealth  uint32 `json:"cardHealth"`
}

type ItemData struct {
	TokenID uint64         `json:"itemTokenId"`
	Type    proto.ItemType `json:"itemType"`
}

type DeckData struct {
	Prism proto.DeckClass `json:"deckPrism"`
	Cards []CardData      `json:"deckCards,omitempty"`
}

type HeroData struct {
	Hero  proto.Hero      `json:"hero"`
	Prism proto.DeckClass `json:"heroPrism"`
}

type HeroSkinData struct {
	Hero    proto.Hero      `json:"hero"`
	TokenID uint64          `json:"heroTokenID"`
	Prism   proto.DeckClass `json:"heroPrism"`
}

type RewardData struct {
	Type     proto.RewardType `json:"rewardType"`
	GameMode proto.GameMode   `json:"rewardGameMode,omitempty"`
	Deck     *DeckData        `json:"rewardDecks,omitempty"`
	Card     *CardData        `json:"rewardCard,omitempty"`
	Item     *ItemData        `json:"rewardItem,omitempty"`
	HeroSkin *HeroSkinData    `json:"rewardHeroSkin,omitempty"`
	Hero     *HeroData        `json:"rewardHero,omitempty"`
	// TODO add:
	// Spark
	// Weave
}

func GetCardData(cardID uint64) CardData {
	card := data.CardIndex.GetCardByID(cardID)
	if card == nil {
		return CardData{}
	}
	return CardData{
		CardId:      cardID,
		CardName:    card.Name,
		CardType:    card.Type.String(),
		CardClass:   card.Class.String(),
		CardElement: card.Element.String(),
		CardMana:    card.ManaCost,
		CardAttack:  card.Power,
		CardHealth:  card.Health,
	}
}

func GetCardsData(cards []uint64) []CardData {
	cardsData := []CardData{}
	for _, cardID := range cards {
		cardsData = append(cardsData, GetCardData(cardID))
	}
	return cardsData
}

func parseDeckType(deckString string) (*proto.DeckType, error) {
	cardIds, _, _, err := data.DecodeDeckString(deckString)
	if err != nil {
		return nil, err
	}
	deckType := proto.DeckType_RANDOM
	if len(cardIds) > 0 {
		deckType = proto.DeckType_CUSTOM
	}
	return &deckType, nil
}
