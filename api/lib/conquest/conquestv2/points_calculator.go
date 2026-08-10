package conquestv2

import (
	"context"
	"fmt"
	"math"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	completedMatchPoints       uint64  = 4
	bonusPercentageForHeroSkin float64 = 0.25
)

// PointsCalculatorImpl calculates points for a conquest match.
type PointsCalculatorImpl struct {
	cardPointsCalculator CardPointsCalculator
	heroSkinFinder       HeroSkinFinder
}

// NewPointsCalculator instantiates a new PointsCalculatorImpl.
func NewPointsCalculator(cardPointsCalculator CardPointsCalculator, heroSkinFinder HeroSkinFinder) *PointsCalculatorImpl {
	return &PointsCalculatorImpl{
		cardPointsCalculator: cardPointsCalculator,
		heroSkinFinder:       heroSkinFinder,
	}
}

func (c *PointsCalculatorImpl) FromDeckString(ctx context.Context, accountID proto.AccountID, deckString string) (uint64, error) {
	// Completed match points
	earnedPoints := completedMatchPoints

	cardPoints, err := c.cardPointsCalculator.FromDeckString(ctx, accountID, deckString)
	if err != nil {
		return 0, fmt.Errorf("calculate points for cards from deck string: %w", err)
	}

	earnedPoints += cardPoints

	heroSkinPoints, err := c.pointsForHeroSkin(ctx, accountID, deckString, earnedPoints)
	if err != nil {
		return 0, fmt.Errorf("calculate points for hero skin from deck string: %w", err)
	}

	earnedPoints += heroSkinPoints

	return earnedPoints, nil
}

func (c *PointsCalculatorImpl) pointsForHeroSkin(ctx context.Context, accountID proto.AccountID, deckString string, earnedPoints uint64) (uint64, error) {
	hasHeroSkin, err := c.heroSkinFinder.HasFromDeckString(ctx, accountID, deckString)
	if err != nil {
		return 0, fmt.Errorf("find hero skin from deck string: %w", err)
	}

	if !hasHeroSkin {
		return 0, nil
	}

	return uint64(math.Ceil(float64(earnedPoints) * bonusPercentageForHeroSkin)), nil
}

func (c *PointsCalculatorImpl) DetailedFromDeckString(ctx context.Context, accountID proto.AccountID, deckString string) (*DetailedPoints, error) {
	detailedPoints := &DetailedPoints{
		MatchPoints: completedMatchPoints,
	}

	earnedPoints := completedMatchPoints

	detailedCardPoints, err := c.cardPointsCalculator.DetailedFromDeckString(ctx, accountID, deckString)
	if err != nil {
		return nil, fmt.Errorf("calculate points for cards from deck string: %w", err)
	}

	earnedPoints += detailedCardPoints.SilverCardPoints
	earnedPoints += detailedCardPoints.GoldCardPoints

	detailedPoints.SilverCardPoints = detailedCardPoints.SilverCardPoints
	detailedPoints.GoldCardPoints = detailedCardPoints.GoldCardPoints

	heroSkinPoints, err := c.pointsForHeroSkin(ctx, accountID, deckString, earnedPoints)
	if err != nil {
		return nil, fmt.Errorf("calculate points for hero skin from deck string: %w", err)
	}

	detailedPoints.HeroSkinPoints = heroSkinPoints

	return detailedPoints, nil
}

type DetailedPoints struct {
	MatchPoints      uint64
	SilverCardPoints uint64
	GoldCardPoints   uint64
	HeroSkinPoints   uint64
}

// CardPointsCalculator calculates points based on cards.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/card_points_calculator.go -package mock . CardPointsCalculator
type CardPointsCalculator interface {
	FromDeckString(context.Context, proto.AccountID, string) (uint64, error)
	DetailedFromDeckString(context.Context, proto.AccountID, string) (*DetailedCardPoints, error)
}

// HeroSkinFinder finds a hero skin for a deck.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/hero_skin_finder.go -package mock . HeroSkinFinder
type HeroSkinFinder interface {
	HasFromDeckString(context.Context, proto.AccountID, string) (bool, error)
}
