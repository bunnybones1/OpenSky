package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type ItemSummary struct {
	*proto.ItemSummary
}

func NewItemSummary(itemSummary *proto.ItemSummary) *ItemSummary {
	return &ItemSummary{
		ItemSummary: itemSummary,
	}
}

func (i *ItemSummary) Store(sess db.Session) db.Store {
	return DB.ItemSummaries(sess)
}

func (i *ItemSummary) Validate() error {
	return nil
}

func (i *ItemSummary) BeforeCreate(sess db.Session) error {
	i.CreatedAt = TimeNowUTCPtr()
	i.UpdatedAt = TimeNowUTCPtr()
	return nil
}

func (i *ItemSummary) BeforeUpdate(sess db.Session) error {
	i.UpdatedAt = TimeNowUTCPtr()
	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
		db.BeforeCreateHook
		db.BeforeUpdateHook
	} = &ItemSummary{}
)

type ItemSummaryStore struct {
	db.Collection
}

func (s *ItemSummaryStore) FindOne(conds ...interface{}) (*ItemSummary, error) {
	var itemSummary *ItemSummary

	err := s.Find(conds...).Limit(1).One(&itemSummary)
	if err != nil && err != db.ErrNoMoreRows {
		return nil, err
	}

	return itemSummary, nil
}
