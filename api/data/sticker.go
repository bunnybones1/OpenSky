package data

import (
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type Sticker struct {
	*proto.Sticker
}

func (s *Sticker) Store(sess db.Session) db.Store {
	return DB.Stickers(sess)
}

var (
	_ interface {
		db.Record
	} = &Sticker{}
)

type StickersStore struct {
	db.Collection
}

func (s *StickersStore) FindOne(conds ...interface{}) (*Sticker, error) {
	var sticker Sticker

	err := s.Find(conds...).Limit(1).One(&sticker)
	if err != nil {
		return nil, err
	}

	return &sticker, nil
}

func (s *StickersStore) FindByID(id uint32) (*Sticker, error) {
	return s.FindOne(db.Cond{"id": id})
}

func (s *StickersStore) FindAll(conds ...interface{}) ([]*Sticker, error) {
	var stickers []*Sticker

	err := s.Find(conds...).OrderBy("required_points").All(&stickers)
	if err != nil {
		return nil, err
	}

	return stickers, nil
}

func (s *StickersStore) FindAllBySeason(season uint16) ([]*Sticker, error) {
	return s.FindAll(db.Cond{"season": season})
}
