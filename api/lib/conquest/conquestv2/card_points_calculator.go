package conquestv2

import (
	"context"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

// CardPointsCalculatorImpl calculates points based on cards.
type CardPointsCalculatorImpl struct {
}

// NewCardPointsCalculator instantiates a new CardPointsCalculatorImpl.
func NewCardPointsCalculator() *CardPointsCalculatorImpl {
	return &CardPointsCalculatorImpl{}
}

// FromDeckString calculates points based on cards.
// Each silver card gives 1 point and each gold card gives 3 points.
func (v CardPointsCalculatorImpl) FromDeckString(ctx context.Context, accountID proto.AccountID, deckString string) (uint64, error) {
	repo := rctx.DBContext(ctx)

	cardIDs, _, _, err := data.DecodeDeckString(deckString)
	if err != nil {
		return 0, fmt.Errorf("decode deck string: %w", err)
	}

	var items []*data.Item

	if err := repo.Items(nil).Find(db.Cond{
		"account_id": accountID,
		"token_id":   db.AnyOf(cardIDs),
		"item_type":  db.In(proto.ItemType_SW_SILVER_CARDS, proto.ItemType_SW_GOLD_CARDS),
		"balance":    db.Gt(0),
	}).All(&items); err != nil {
		return 0, fmt.Errorf("find items: %w", err)
	}

	pointsByCardID := map[uint64]uint64{}

	for _, item := range items {
		switch item.ItemType {
		case proto.ItemType_SW_SILVER_CARDS:
			if pointsByCardID[item.TokenID] < 1 { // To not overwrite higher points.
				pointsByCardID[item.TokenID] = 1
			}
		case proto.ItemType_SW_GOLD_CARDS:
			pointsByCardID[item.TokenID] = 3
		default:
		}
	}

	var points uint64

	for _, pointsByCard := range pointsByCardID {
		points += pointsByCard
	}

	return points, nil
}

func (v CardPointsCalculatorImpl) DetailedFromDeckString(ctx context.Context, accountID proto.AccountID, deckString string) (*DetailedCardPoints, error) {
	repo := rctx.DBContext(ctx)

	detailedCardPoints := &DetailedCardPoints{}

	cardIDs, _, _, err := data.DecodeDeckString(deckString)
	if err != nil {
		return nil, fmt.Errorf("decode deck string: %w", err)
	}

	var items []*data.Item

	if err := repo.Items(nil).Find(db.Cond{
		"account_id": accountID,
		"token_id":   db.AnyOf(cardIDs),
		"item_type":  db.In(proto.ItemType_SW_SILVER_CARDS, proto.ItemType_SW_GOLD_CARDS),
		"balance":    db.Gt(0),
	}).All(&items); err != nil {
		return nil, fmt.Errorf("find items: %w", err)
	}

	pointsByCardID := map[uint64]uint64{}

	for _, item := range items {
		switch item.ItemType {
		case proto.ItemType_SW_SILVER_CARDS:
			if pointsByCardID[item.TokenID] < 1 { // To not overwrite higher points.
				pointsByCardID[item.TokenID] = 1
			}
		case proto.ItemType_SW_GOLD_CARDS:
			pointsByCardID[item.TokenID] = 3
		default:
		}
	}

	for _, cardPoints := range pointsByCardID {
		switch cardPoints {
		case 1:
			detailedCardPoints.SilverCardPoints += cardPoints
		case 3:
			detailedCardPoints.GoldCardPoints += cardPoints
		}
	}

	return detailedCardPoints, nil
}

type DetailedCardPoints struct {
	SilverCardPoints uint64
	GoldCardPoints   uint64
}
