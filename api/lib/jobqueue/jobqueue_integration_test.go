//go:build integration

package jobqueue_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestWorker(t *testing.T) {
	ctrl := gomock.NewController(t)

	metricsCollector := mock.NewMockMetricsCollector(ctrl)

	t.Run("register task runner", func(t *testing.T) {
		t.Run("success", func(t *testing.T) {
			runner := mock.NewMockRunner(ctrl)
			runner.EXPECT().WorkGroup().AnyTimes().Return("group")

			worker := jobqueue.NewWorker(metricsCollector)

			err := worker.RegisterTaskRunner(runner)
			assert.NoError(t, err)
		})

		t.Run("fails when already registered", func(t *testing.T) {
			runner := mock.NewMockRunner(ctrl)
			runner.EXPECT().WorkGroup().AnyTimes().Return("group")

			worker := jobqueue.NewWorker(metricsCollector)

			err := worker.RegisterTaskRunner(runner)
			assert.NoError(t, err)

			err = worker.RegisterTaskRunner(runner)
			assert.ErrorContains(t, err, "runner for task group 'group' already registered")
		})
	})

	t.Run("start", func(t *testing.T) {
		t.Run("success", func(t *testing.T) {
			workGroup := "group"
			_, err := data.DB.TaskRunners(nil).Insert(&proto.TaskRunner{
				WorkGroup: workGroup,
				RunAt:     time.Now(),
			})
			assert.NoError(t, err)

			queue := "queue"
			payload := mockPayload{
				Data: "foo",
				hash: "bar",
			}
			runAt := time.Now().UTC()
			accountID := proto.AccountID(10)
			err = data.DB.Tasks(nil).EnqueueTask(
				queue,
				payload,
				&runAt,
				&accountID,
			)
			assert.NoError(t, err)

			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()

			ticker := make(chan time.Time)
			go func(ticker chan time.Time) {
				ticker <- time.Now()
			}(ticker)

			runner := mock.NewMockRunner(ctrl)
			runner.EXPECT().WorkGroup().AnyTimes().Return(workGroup)
			runner.EXPECT().Tick().Return(ticker)
			runner.EXPECT().Queues().Return([]string{queue})
			runner.EXPECT().MaxBatchSize().Return(1)
			runner.EXPECT().RunTasks(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, _ db.Session, tasks []*data.Task) error {
				defer cancel()

				require.Len(t, tasks, 1)
				task := tasks[0]
				assert.Equal(t, proto.TaskStatus_PENDING, task.Status)
				assert.Equal(t, accountID, *task.AccountID)
				assert.Equal(t, queue, task.Queue)
				assert.Equal(t, runAt.UnixMilli(), task.RunAt.UnixMilli())
				assert.Equal(t, payload.hash, *task.Hash)
				assert.JSONEq(t, `{"data":"foo"}`, string(task.Payload))

				return nil
			})

			metricsCollector.EXPECT().TrackTasksAttempt(runner, gomock.Any())

			worker := jobqueue.NewWorker(metricsCollector)

			err = worker.RegisterTaskRunner(runner)
			assert.NoError(t, err)

			worker.Start(ctx)
		})
	})
}

func TestUpdateFailedTasks(t *testing.T) {
	t.Run("sets future run when max retries are not met", func(t *testing.T) {
		task := data.Task{&proto.Task{
			Status: proto.TaskStatus_PENDING,
			Try:    1,
		}}

		jobqueue.UpdateFailedTasks([]*data.Task{&task}, 10, 2)
		assert.Equal(t, proto.TaskStatus_PENDING, task.Status)
		assert.Less(t, time.Now(), *task.RunAt)
	})

	t.Run("sets as failed when retries exceed expected max retries", func(t *testing.T) {
		task := data.Task{&proto.Task{
			Status: proto.TaskStatus_PENDING,
			Try:    1,
		}}

		jobqueue.UpdateFailedTasks([]*data.Task{&task}, 10, 1)
		assert.Equal(t, proto.TaskStatus_FAILED, task.Status)
		assert.Nil(t, task.RunAt)
	})

	t.Run("sets as failed when retries exceed system max retries", func(t *testing.T) {
		task := data.Task{&proto.Task{
			Status: proto.TaskStatus_PENDING,
			Try:    32766, // highest value of smallint we store
		}}

		jobqueue.UpdateFailedTasks([]*data.Task{&task}, 10, 32770)
		assert.Equal(t, proto.TaskStatus_FAILED, task.Status)
		assert.Nil(t, task.RunAt)
	})
}

func TestUpdateCompletedTasks(t *testing.T) {
	t.Run("sets as completed", func(t *testing.T) {
		createdAt := time.Now()
		task := data.Task{&proto.Task{
			Status:    proto.TaskStatus_PENDING,
			CreatedAt: &createdAt,
		}}

		jobqueue.UpdateCompletedTasks([]*data.Task{&task})
		assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)
	})
}

func TestUpdatePausedTasks(t *testing.T) {
	t.Run("sets as paused", func(t *testing.T) {
		createdAt := time.Now()
		task := data.Task{&proto.Task{
			Status:    proto.TaskStatus_PENDING,
			CreatedAt: &createdAt,
		}}

		jobqueue.UpdatePausedTasks([]*data.Task{&task})
		assert.Equal(t, proto.TaskStatus_PAUSED, task.Status)
	})
}

type mockPayload struct {
	Data string `json:"data"`
	hash string
}

func (p mockPayload) Hash() string {
	return p.hash
}
