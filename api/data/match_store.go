package data

import (
	db "github.com/upper/db/v4"
)

type MatchesStore struct {
	db.Collection
}

// FindOne returns one of the match that match the given conditions.
func (s *MatchesStore) FindOne(conds ...interface{}) (*Match, error) {
	var match Match

	err := s.Find(conds...).Limit(1).One(&match)
	if err != nil {
		return nil, err
	}

	return &match, nil
}

func (s *MatchesStore) FindByID(id uint64) (*Match, error) {
	return s.FindOne(db.Cond{"id": id})
}
