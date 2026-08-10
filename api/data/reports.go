package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type Report struct {
	*proto.Report
}

func (a *Report) Store(sess db.Session) db.Store {
	return DB.Reports(sess)
}

type ReportsStore struct {
	db.Collection
}
