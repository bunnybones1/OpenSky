package factorcalculators

import (
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type TradableCardsCalculator struct {
}

func NewTradableCalculator() *TradableCardsCalculator {
	return &TradableCardsCalculator{}
}

// Calculate 1 if both players are using a starter deck. 0 otherwise.
func (c *TradableCardsCalculator) Calculate(p1, p2 *player.Player) matchquality.Factor {
	if p1.Account == nil || p2.Account == nil {
		return c.newFactor(0)
	}

	p1Silvers, p1Golds := c.countCardRarities(p1.Account.Cards)
	p2Silvers, p2Golds := c.countCardRarities(p2.Account.Cards)

	p1TradableCards := p1Silvers + p1Golds
	p2TradableCards := p2Silvers + p2Golds

	if p1TradableCards == 0 && p2TradableCards == 0 {
		return c.newFactor(1)
	}

	return c.newFactor(0)
}

func (c *TradableCardsCalculator) countCardRarities(cards player.CardRarities) (uint, uint) {
	cardCount := make(map[player.Rarity]uint)

	for _, rarity := range cards {
		cardCount[rarity] += 1
	}

	return cardCount[player.Rarity_SILVER], cardCount[player.Rarity_GOLD]
}

func (c *TradableCardsCalculator) newFactor(value float64) matchquality.Factor {
	return matchquality.NewFactor("Tradable cards", 15, -0.5, value)
}
