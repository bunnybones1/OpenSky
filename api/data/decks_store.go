package data

import (
	"github.com/upper/db/v4"
)

// DecksStore represents an deck set.
type DecksStore struct {
	db.Collection
}

// FindOne returns one of the decks that match the given conditions.
func (d *DecksStore) FindOne(conds ...interface{}) (*Deck, error) {
	var deck Deck

	err := d.Find(conds...).Limit(1).One(&deck)
	if err != nil {
		return nil, err
	}

	return &deck, nil
}
