package data

import (
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

// ITEM_ID: PRIORITY
var crystalsPriority = map[uint64]int{
	7: 1,
	1: 2,
	2: 3,
	3: 4,
	8: 5,
	4: 6,
	5: 7,
	6: 8,
}

type CrystalGetter struct {
}

func NewCrystalGetter() *CrystalGetter {
	return &CrystalGetter{}
}

func (g *CrystalGetter) GetTopPriority(sess db.Session, accountIDs []proto.AccountID) (map[proto.AccountID]uint64, error) {
	var items []*Item

	err := DB.Items(sess).Find(db.Cond{
		"account_id": db.AnyOf(accountIDs),
		"item_type":  proto.ItemType_SW_CRYSTALS,
		"balance":    db.Gt(0),
	}).All(&items)
	if err != nil {
		return nil, fmt.Errorf("find items: %w", err)
	}

	crystalsMap := make(map[proto.AccountID]uint64)

	for _, item := range items {
		if crystalsMap[item.AccountID] == 0 {
			crystalsMap[item.AccountID] = item.TokenID

			continue
		}

		if crystalsPriority[item.TokenID] == 0 {
			continue
		}

		if crystalsPriority[item.TokenID] >= crystalsPriority[crystalsMap[item.AccountID]] {
			continue
		}

		crystalsMap[item.AccountID] = item.TokenID
	}

	return crystalsMap, nil
}
