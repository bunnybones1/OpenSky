package data

import (
	"github.com/upper/db/v4"
)

// CardsStore represents an card set.
type CardsStore struct {
	db.Collection
}

// FindOne returns one of the cards that match the given conditions.
func (s *CardsStore) FindOne(conds ...interface{}) (*Card, error) {
	var card Card

	err := s.Find(conds...).Limit(1).One(&card)
	if err != nil {
		return nil, err
	}

	return &card, nil
}

func (s *CardsStore) FindByID(id uint32) (*Card, error) {
	return s.FindOne(db.Cond{"id": id})
}
