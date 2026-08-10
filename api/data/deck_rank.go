package data

import (
	"github.com/pkg/errors"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
)

// DeckRank represents a deck rank.
type DeckRank struct {
	*proto.DeckRank

	Account *proto.Account `db:"-"`
}

// NewDeck returns a new deck.
func NewDeckRank() *DeckRank {
	return &DeckRank{DeckRank: &proto.DeckRank{}}
}

func (d *DeckRank) Store(sess db.Session) db.Store {
	return DB.DeckRanks(sess)
}

// Validate returns an error if the deck rank does not pass validation rules.
func (d *DeckRank) Validate() error {
	/*
		if len(d.HighestPlayerAddress) == 0 {
			return errors.New("a deck rank must have an account address")
		}
	*/
	if d.DeckString == "" {
		return errors.New("invalid deck string")
	}

	return nil
}

// BeforeCreate satisfies db.BeforeCreateHook.
func (d *DeckRank) BeforeCreate(sess db.Session) error {
	if err := d.beforeSave(sess); err != nil {
		return err
	}
	return nil
}

// BeforeUpdate satisfies db.BeforeUpdateHook.
func (d *DeckRank) BeforeUpdate(sess db.Session) error {
	if err := d.beforeSave(sess); err != nil {
		return err
	}
	return nil
}

func (d *DeckRank) beforeSave(sess db.Session) error {
	cardIDs, class, _, err := DecodeDeckString(d.DeckString)
	if err != nil {
		return err
	}
	d.CardIDs = cardIDs
	d.Class = class
	if d.Class == 0 {
		return errors.New("deck has no class")
	}
	d.CardsRevision = cardsRevision

	if d.RankState.Win != ranking.OutcomeUndefined {
		d.Score = &d.RankState.RP
	}

	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
		db.BeforeCreateHook
		db.BeforeUpdateHook
	} = &DeckRank{}
)
