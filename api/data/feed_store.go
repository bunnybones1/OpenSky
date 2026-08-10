package data

import (
	db "github.com/upper/db/v4"
)

// FeedEventsStore represents an FeedEvent set.
type FeedEventsStore struct {
	db.Collection
}

// FindOne returns one of the FeedEvents that match the given conditions.
func (s *FeedEventsStore) FindOne(conds ...interface{}) (*FeedEvent, error) {
	var FeedEvent FeedEvent

	err := s.Find(conds...).Limit(1).One(&FeedEvent)
	if err != nil {
		return nil, err
	}

	return &FeedEvent, nil
}

func (s *FeedEventsStore) FindByID(id uint32) (*FeedEvent, error) {
	return s.FindOne(db.Cond{"id": id})
}
