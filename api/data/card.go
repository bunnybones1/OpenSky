package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

// Card represents a single card. And the `cards` table is essentially a
// database representation of the card sheet.
type Card struct {
	*proto.Card
}

// NewCard returns a new card.
func NewCard(card *proto.Card) *Card {
	return &Card{
		Card: card,
	}
}

func (c *Card) Store(sess db.Session) db.Store {
	return DB.Cards(sess)
}

// Validate returns an error if the card does not pass validation rules.
func (c *Card) Validate() error {
	if c.Name == "" {
		return errMissingParam("name")
	}
	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &Card{}
)
