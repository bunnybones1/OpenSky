package data

import (
	"encoding/json"
	"fmt"
	"time"

	db "github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type TaskStore struct {
	db.Collection
}

type Payload interface {
	Hash() string
}

type QueueCount struct {
	Total  int              `db:"total"`
	Status proto.TaskStatus `db:"status"`
	Queue  string           `db:"queue"`
}

type QueueLag struct {
	Queue string  `db:"queue"`
	Lag   float64 `db:"lag_seconds"`
}

func (t *TaskStore) CountTasks(queues []string) ([]*QueueCount, error) {
	statuses := []proto.TaskStatus{
		proto.TaskStatus_PENDING,
		proto.TaskStatus_PAUSED,
		proto.TaskStatus_FAILED,
		proto.TaskStatus_COMPLETED,
	}

	// filling with zeroes
	ptrs := map[string]map[proto.TaskStatus]*QueueCount{}
	results := []*QueueCount{}
	for _, name := range queues {
		for _, status := range statuses {
			counter := QueueCount{
				Queue:  name,
				Status: status,
			}
			if ptrs[name] == nil {
				ptrs[name] = map[proto.TaskStatus]*QueueCount{}
			}
			ptrs[name][status] = &counter
			results = append(results, ptrs[name][status])
		}
	}

	// We want to count all but scheduled task (which are pending but not
	// considered yet as part of the queue)
	items := []*QueueCount{}
	err := t.Session().SQL().Select(db.Raw("COUNT(1) AS total"), "queue", "status").From("tasks").Where(
		db.And(
			db.Cond{"queue": db.AnyOf(queues)},
			db.Or(
				db.Raw(
					"status = ? AND run_at <= NOW() at time zone 'utc'",
					proto.TaskStatus_PENDING,
				),
				db.Cond{
					"status": db.In(
						proto.TaskStatus_PAUSED,
						proto.TaskStatus_FAILED,
						proto.TaskStatus_COMPLETED,
					),
				},
			),
		),
	).GroupBy("queue", "status").All(&items)
	if err != nil {
		return nil, err
	}
	// Set actual quantities
	for _, item := range items {
		ptrs[item.Queue][item.Status].Total = item.Total
	}

	return results, nil
}

func (t *TaskStore) GetTasksLock(queues []string, batchSize int) ([]*Task, error) {
	// "FOR UPDATE SKIP LOCKED" has following effect:
	// - sets advisory lock on selected rows
	// - skips locked rows
	// - lock is released when transaction is commited or rolled back
	// This guarantees exactly one worker can execute this task

	var tasks []*Task

	err := t.Session().SQL().SelectFrom("tasks").Where(
		db.And(
			db.Cond{
				"status": proto.TaskStatus_PENDING,
				"queue":  db.AnyOf(queues),
			},
			db.Raw("run_at <= NOW() at time zone 'utc'"),
		),
	).Amend(func(query string) string {
		return query + fmt.Sprintf(` ORDER BY run_at ASC NULLS FIRST
		FOR UPDATE SKIP LOCKED
		LIMIT %d`, batchSize)
	}).All(&tasks)

	return tasks, err
}

func (t *TaskStore) GetLagSecondsForAllQueues() ([]*QueueLag, error) {
	lagForAllQueues := []*QueueLag{}
	err := t.Session().SQL().Select("queue", db.Raw("EXTRACT(epoch FROM (NOW() - MIN(run_at))) AS lag_seconds")).From("tasks").
		Where(
			db.And(
				db.Cond{
					"status": proto.TaskStatus_PENDING,
				},
				db.Raw("run_at <= NOW() at time zone 'utc'"),
			),
		).
		GroupBy("queue").
		All(&lagForAllQueues)

	return lagForAllQueues, err
}

func (t *TaskStore) EnqueueTask(queue string, payload Payload, runAt *time.Time, accountID *proto.AccountID, status ...proto.TaskStatus) error {
	p, hash, err := ProcessTaskPayload(payload)
	if err != nil {
		return err
	}

	if runAt == nil {
		now := time.Now().UTC()
		runAt = &now
	}

	taskStatus := proto.TaskStatus_PENDING
	if len(status) > 0 {
		taskStatus = status[0]
	}

	v := &Task{
		Task: &proto.Task{
			Status:    taskStatus,
			Queue:     queue,
			Payload:   p,
			RunAt:     runAt,
			Hash:      &hash,
			AccountID: accountID,
		},
	}

	// TODO: anytime we fail to enqueue a task, always alert our devops
	// channel, we should think about honeybadger, sentry or other to create
	// an alert system right from the code for critical paths like this.

	return t.Session().Save(v)
}

func (t *TaskStore) EnqueueTaskIgnoringDuplicates(queue string, payload Payload, runAt *time.Time, accountID *proto.AccountID, status ...proto.TaskStatus) error {
	p, hash, err := ProcessTaskPayload(payload)
	if err != nil {
		return err
	}

	if runAt == nil {
		now := time.Now().UTC()
		runAt = &now
	}

	taskStatus := proto.TaskStatus_PENDING
	if len(status) > 0 {
		taskStatus = status[0]
	}

	v := &Task{
		Task: &proto.Task{
			Status:    taskStatus,
			Queue:     queue,
			Payload:   p,
			RunAt:     runAt,
			Hash:      &hash,
			AccountID: accountID,
		},
	}

	row, err := t.Session().SQL().InsertInto("tasks").Values(v).Amend(func(s string) string {
		return s + `ON CONFLICT (queue, hash) DO NOTHING`
	}).QueryRow()
	if err != nil {
		return err
	}

	// TODO: anytime we fail to enqueue a task, always alert our devops
	// channel, we should think about honeybadger, sentry or other to create
	// an alert system right from the code for critical paths like this.

	return row.Err()
}

func ProcessTaskPayload(payload Payload) ([]byte, string, error) {
	p, err := json.Marshal(payload)
	if err != nil {
		return nil, "", err
	}
	var hash string
	if payload != nil {
		hash = payload.Hash()
	}

	return p, hash, nil
}

var _ = db.Store(&TaskStore{})
