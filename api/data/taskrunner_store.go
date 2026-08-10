package data

import (
	db "github.com/upper/db/v4"
)

type TaskRunnerStore struct {
	db.Collection
}

func (w *TaskRunnerStore) GetWorkGroupLock(workGroup string) (*TaskRunner, error) {
	// "FOR UPDATE SKIP LOCKED" has following effect:
	// - sets advisory lock on selected row
	// - skips locked rows
	// - lock is released when transaction is commited or rolled back
	// This guarantees global concurency per workgroup is at most
	// equal to number of rows with that value of workgroup column

	lock := &TaskRunner{}

	err := w.Session().SQL().SelectFrom("task_runners").
		Where(db.Raw("run_at <= NOW() at time zone 'utc'"), db.Cond{"work_group": workGroup}).Amend(func(query string) string {
		return query + ` ORDER BY run_at ASC NULLS FIRST
		FOR UPDATE SKIP LOCKED
		LIMIT 1`
	}).One(&lock)

	return lock, err
}
