package jobqueue

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/runner.go -package mock . Runner
type Runner interface {
	// RunTasks is the primary task-running method. Returning an error
	// means the tasks was unsuccessful.
	RunTasks(context.Context, db.Session, []*data.Task) error

	// Tick defines an interval when Runner dequeues its task.
	Tick() <-chan time.Time

	// WorkGroup is a namespace for tasks of this runner.
	WorkGroup() string

	// MaxBatchSize is number of tasks dequeued in a single run.
	MaxBatchSize() int

	// Queues is a list of queues the runner listens on.
	Queues() []string
}

// Worker is the primary start exec worker of the job queue system. The worker
// will spin up each runner to execute as its own goroutine in the background.
type Worker struct {
	taskRunners      map[string]Runner
	mu               sync.Mutex
	metricsCollector MetricsCollector
}

const maxTryCount = 32767 - 1 // highest value of smallint we store

func NewWorker(metricsCollector MetricsCollector) *Worker {
	if err := data.CardIndex.Sync(); err != nil {
		log.Fatal().Err(errors.Wrap(err, "failed to sync cards index from the DB"))
	}

	return &Worker{
		taskRunners:      map[string]Runner{},
		metricsCollector: metricsCollector,
	}
}

func (w *Worker) RegisterTaskRunner(runner Runner) error {
	if _, alreadyRegistered := w.getRunner(runner.WorkGroup()); alreadyRegistered {
		return fmt.Errorf("runner for task group '%s' already registered", runner.WorkGroup())
	}

	w.mu.Lock()
	w.taskRunners[runner.WorkGroup()] = runner
	defer w.mu.Unlock()

	return nil
}

func (w *Worker) getRunner(workGroup string) (Runner, bool) {
	w.mu.Lock()
	defer w.mu.Unlock()

	runner, ok := w.taskRunners[workGroup]

	return runner, ok
}

func (w *Worker) Start(ctx context.Context) {
	wg := sync.WaitGroup{}

	for workGroup, runner := range w.taskRunners {
		wg.Add(1)

		go func(grp string, r Runner) {
			runnerTick := r.Tick()

			for {
				select {
				case <-ctx.Done():
					wg.Done()
					return

				case <-runnerTick:
					w.run(ctx, r)
				}
			}
		}(workGroup, runner)
	}

	wg.Wait()
}

func (w *Worker) run(ctx context.Context, runner Runner) {
	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		// sets advisory lock on a row in task_runners table
		// max concurrency per workgroup == number of rows with that workgroup
		runnerLock := w.getRunnerLock(sess, runner)
		if runnerLock == nil {
			return nil
		}

		// count total items in the queue
		// TODO: fix performance of this - it was responsible for over 90% of production database load
		// 1. fix the query (add missing index or rewrite query)
		// 2. limit how often this runs - once every 5 minutes per queue would be fine
		// recordQueuesSize(sess, runner)

		// set advisory lock on rows in tasks to ensure only one runner can be executing them
		tasks, err := data.DB.Tasks(sess).GetTasksLock(runner.Queues(), runner.MaxBatchSize())
		if err != nil {
			log.Error().Msgf("fetching and locking tasks for %s workgroup failed with %v", runner.WorkGroup(), err)
			return err
		}

		if len(tasks) == 0 {
			log.Debug().Msgf("no pending tasks for workgroup %s", runner.WorkGroup())
			return nil
		}

		// Create a transaction savepoint before passing transaction to the runner
		// If db operations after savepoint fail you can roll transaction back
		// to savepoint and still commit the rest
		_, err = sess.SQL().Exec("SAVEPOINT runner_start")
		if err != nil {
			return errors.Wrap(err, "creating a savepoint failed")
		}

		log.Debug().Msgf("starting runner for %s workgroup with %d tasks", runner.WorkGroup(), len(tasks))

		w.recordTasksAttempt(runner, tasks)

		// TODO: use `ctx` here? or another one?
		err = runner.RunTasks(context.Background(), sess, tasks)
		if err != nil {
			// On runner error rollback transaction to the savepoint before runner started
			if _, rollbackErr := sess.SQL().Exec("ROLLBACK TO SAVEPOINT runner_start"); rollbackErr != nil {
				// Compose the two different errors on this context
				return errors.Wrap(err, fmt.Sprintf("could not rollback to savepoint: %v", rollbackErr))
			}
			return err
		}

		// On success release savepoint and continue with transaction
		if _, err := sess.SQL().Exec("RELEASE SAVEPOINT runner_start"); err != nil {
			return errors.Wrap(err, "could not release savepoint")
		}

		log.Debug().Msgf("finished %d tasks for workgroup %s", len(tasks), runner.WorkGroup())

		// update tasks
		for _, task := range tasks {
			w.metricsCollector.TrackTaskDuration(runner, task)

			if err = sess.Save(task); err != nil {
				log.Error().Msgf("failed updating task %d status with %v", task.ID, err)
				return err
			}
		}

		return nil
	}, nil)
	if err != nil {
		log.Error().Msgf("runner for %s workgroup failed with %v", runner.WorkGroup(), err)
	}
}

func (w *Worker) getRunnerLock(sess db.Session, runner Runner) *data.TaskRunner {
	lock, err := data.DB.TaskRunners(sess).GetWorkGroupLock(runner.WorkGroup())
	if err != nil {
		if err == db.ErrNoMoreRows {
			log.Debug().Msgf("all task runners in %s workgroup are busy", runner.WorkGroup())
			return nil
		}

		log.Error().Msgf("obtaining task runner lock for %s workgroup failed with %v", runner.WorkGroup(), err)

		return nil
	}

	return lock
}

func (w *Worker) recordTasksAttempt(runner Runner, tasks []*data.Task) {
	w.metricsCollector.TrackTasksAttempt(runner, tasks)

	startTime := time.Now().UTC()

	for _, task := range tasks {
		task.LastRanAt = &startTime

		if task.Try < maxTryCount {
			task.Try++
		} else {
			task.Status = proto.TaskStatus_FAILED
		}
	}
}

// UpdateFailedTasks marks the tasks as failed, and sets to retry them sometime in the future,
// unless the task has hit max retries, at which point it is determined to be fully failed.
func UpdateFailedTasks(tasks []*data.Task, retryDelayInSecs int, maxTries int) {
	for _, task := range tasks {
		if task.Try >= uint32(maxTries) || task.Try >= maxTryCount {
			task.Status = proto.TaskStatus_FAILED
			continue
		}

		// Next retry delay is number of try times retryDelay
		// Max time until failed is (maxTries*(maxTries+1)/2)*retryDelay
		// for maxTries equal:
		// 5:	15		* retryDelay
		// 10:	55		* retryDelay
		// 20:	210		* retryDelay
		// 25:  325		* retryDelay
		// 50: 	1275	* retryDelay
		// 100:	5050	* retryDelay

		nextRun := time.Now().UTC().Add(time.Second * time.Duration(retryDelayInSecs) * time.Duration(task.Try))
		task.RunAt = &nextRun
	}
}

// UpdateCompletedTasks marks the tasks as completed.
func UpdateCompletedTasks(tasks []*data.Task) {
	now := time.Now().UTC()

	for _, task := range tasks {
		if task == nil {
			continue
		}

		task.Status = proto.TaskStatus_COMPLETED

		log.Debug().Msgf("Task %d for %s completed after %d tries and %s in queue", task.ID, task.Queue, task.Try, now.Sub(*task.CreatedAt).String())
	}
}

// UpdatePausedTasks marks the tasks as paused.
func UpdatePausedTasks(tasks []*data.Task) {
	now := time.Now().UTC()

	for _, task := range tasks {
		task.Status = proto.TaskStatus_PAUSED
		log.Debug().Msgf("Task %d for %s paused after %d tries and %s in queue", task.ID, task.Queue, task.Try, now.Sub(*task.CreatedAt).String())
	}
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/metrics_collector.go -package mock . MetricsCollector
type MetricsCollector interface {
	TrackTasksAttempt(runner Runner, tasks []*data.Task)
	TrackTaskDuration(runner Runner, task *data.Task)
	TrackTxMintingDuration(status string, submittedAt time.Time)
	TrackLastBlockNumber(process string, blockNumber uint64)
}

func getAccountID(sess db.Session, accountID proto.AccountID, accountAddress proto.Hash) (proto.AccountID, error) {
	if accountID.IsValid() {
		return accountID, nil
	}

	if !accountAddress.IsValidAddress() {
		return 0, fmt.Errorf("invalid account address %s", accountAddress)
	}

	account, err := data.DB.Accounts(sess).FindByAddress(accountAddress)
	if err != nil {
		return 0, fmt.Errorf("find account by address %s: %w", accountAddress, err)
	}

	return account.ID, nil
}
