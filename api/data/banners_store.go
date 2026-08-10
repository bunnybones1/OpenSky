package data

import (
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type BannersStore struct {
	db.Collection
}

func (s *BannersStore) AllValidBanners() ([]*proto.Banner, error) {
	var banners []*proto.Banner
	err := s.Find(
		db.Or(
			db.Cond{"end_at": db.Gt(time.Now())},
			db.Cond{"end_at": db.IsNull()},
		),
		db.Cond{"start_at": db.Lt(time.Now())},
	).All(&banners)

	if err != nil {
		return nil, err
	}
	return banners, nil
}

func (s *BannersStore) AllBanners() ([]*proto.Banner, error) {
	var banners []*proto.Banner

	err := s.Find().All(&banners)
	if err != nil {
		return nil, err
	}

	return banners, nil
}
