package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type FeedEvent struct {
	*proto.FeedEvent
}

func (f *FeedEvent) Store(sess db.Session) db.Store {
	return DB.FeedEvents(sess)
}

var _ = db.Record(&FeedEvent{})
