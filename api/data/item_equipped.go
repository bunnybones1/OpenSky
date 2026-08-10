package data

import (
	"fmt"
	"math/big"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type ItemEquipped struct {
	AccountID proto.AccountID `db:"account_id"`
	ItemID    uint64          `db:"items_id"`
	ItemType  proto.ItemType  `db:"item_type"`
	TokenID   uint64          `db:"token_id"`
	UpdatedAt *time.Time      `db:"updated_at,omitempty"`
}

func (i *ItemEquipped) Store(sess db.Session) db.Store {
	return DB.ItemsEquipped(sess)
}

var (
	_ interface {
		db.Record
	} = &SkypassRewardClaim{}
)

type ItemsEquippedStore struct {
	db.Collection
}

func (s *ItemsEquippedStore) Equip(item *Item) error {
	if !item.AccountID.IsValid() {
		return fmt.Errorf("invalid account ID: %d", item.AccountID)
	}

	if item.ID == 0 {
		return fmt.Errorf("invalid ID: %d", item.ID)
	}

	if item.Balance.Lte(big.NewInt(0)) {
		return fmt.Errorf("invalid balance: %d", item.Balance.Int64())
	}

	switch item.ItemType {
	case proto.ItemType_SW_STICKERS, proto.ItemType_SW_CARD_BACKS:
		itemEquipped := &ItemEquipped{
			AccountID: item.AccountID,
			ItemID:    item.ID,
			ItemType:  item.ItemType,
			TokenID:   item.TokenID,
		}

		row, err := s.Session().SQL().InsertInto("items_equipped").Values(itemEquipped).Amend(func(s string) string {
			return s + `ON CONFLICT (account_id, items_id) DO NOTHING`
		}).QueryRow()
		if err != nil {
			return err
		}

		return row.Err()
	default:
		return fmt.Errorf("unsupported item type: %s", item.ItemType)
	}
}

func (s *ItemsEquippedStore) Unequip(item *Item) error {
	if !item.AccountID.IsValid() {
		return fmt.Errorf("invalid account ID: %d", item.AccountID)
	}

	_, err := s.Session().SQL().DeleteFrom("items_equipped").Where(
		"account_id = ? AND item_type = ? AND token_id = ?", item.AccountID, item.ItemType, item.TokenID,
	).Exec()
	if err != nil {
		return err
	}

	return nil
}

func (s *ItemsEquippedStore) List(accountID proto.AccountID, itemType *proto.ItemType) ([]*ItemEquipped, error) {
	var itemsEquipped []*ItemEquipped

	cond := db.And(db.Cond{"account_id": accountID})

	if itemType != nil {
		cond = cond.And(db.Cond{"item_type": *itemType})
	}

	if err := s.Find(cond).All(&itemsEquipped); err != nil {
		return nil, fmt.Errorf("find equipped items: %w", err)
	}

	return itemsEquipped, nil
}
