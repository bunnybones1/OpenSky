package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type TwitchFeaturedStreamersStore struct {
	db.Collection
}

func (s *TwitchFeaturedStreamersStore) AllFeaturedStreamers() ([]*proto.TwitchFeaturedStreamer, error) {
	var streamers []*proto.TwitchFeaturedStreamer
	err := s.Find().All(&streamers)
	if err != nil {
		return nil, err
	}
	return streamers, nil
}
