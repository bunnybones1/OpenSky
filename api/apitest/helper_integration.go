//go:build integration

package apitest

import (
	"encoding/json"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func GetTask[T data.Payload](queue string, accountID *proto.AccountID) (*data.Task, *T, error) {
	var task *data.Task

	cond := db.And(db.Cond{"queue": queue})

	if accountID != nil {
		cond.And(db.Cond{"account_id": *accountID})
	}

	if err := data.DB.Tasks().Find(cond).One(&task); err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var payload *T

	if err := json.Unmarshal(task.Payload, &payload); err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, payload, nil
}
