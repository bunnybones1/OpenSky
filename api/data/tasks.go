package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type Task struct {
	*proto.Task
}

func (t *Task) Store(sess db.Session) db.Store {
	return DB.Tasks(sess)
}

var _ = db.Record(&Task{})
