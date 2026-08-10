package data

import (
	"context"
	"fmt"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type HeroSkin struct {
	ID   uint64     `db:"id"`
	Hero proto.Hero `db:"hero"`
}

func (s *HeroSkin) Store(sess db.Session) db.Store {
	return DB.HeroSkins(sess)
}

func (s *HeroSkin) Validate() error {
	if s.Hero == 0 {
		return fmt.Errorf("key cannot be empty")
	}

	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &HeroSkin{}
)

type HeroSkinsStore struct {
	db.Collection
}

// HeroSkinFinder finds a hero skin of an account.
type HeroSkinFinder struct {
}

// NewHeroSkinFinder instantiates a new HeroSkinFinder.
func NewHeroSkinFinder() *HeroSkinFinder {
	return &HeroSkinFinder{}
}

func (f *HeroSkinFinder) HasFromDeckString(_ context.Context, accountID proto.AccountID, deckString string) (bool, error) {
	_, deckClass, _, err := DecodeDeckString(deckString)
	if err != nil {
		return false, fmt.Errorf("decode deck string %q: %w", deckString, err)
	}

	hero := DeckClassHero(deckClass)

	var heroSkin *HeroSkin

	err = DB.HeroSkins(nil).Find(db.Cond{"hero": hero}).One(&heroSkin)
	if err != nil {
		if err == db.ErrNoMoreRows {
			return false, nil
		}

		return false, fmt.Errorf("find hero skin: %w", err)
	}

	item, err := DB.Items(nil).FindAccountItem(accountID, proto.ItemType_SW_HERO_SKINS, heroSkin.ID)
	if err != nil {
		if err == db.ErrNoMoreRows {
			return false, nil
		}

		return false, fmt.Errorf("find item: %w", err)
	}

	if item.Balance.Equals(prototyp.NewBigInt(0).Int()) {
		return false, nil
	}

	return true, nil
}
