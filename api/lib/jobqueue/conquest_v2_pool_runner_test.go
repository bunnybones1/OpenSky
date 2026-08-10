package jobqueue_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestConquestV2PoolRunner(t *testing.T) {
	var poolManager *mock.MockConquestV2PoolManager

	var task *data.Task

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			poolManager = mock.NewMockConquestV2PoolManager(ctrl)
		}

		// Task
		{
			taskPayload := jobqueue.ConquestV2PoolRecalculateTask{
				CreatedAt: data.TimeNowUTC(),
			}

			payloadJSON, err := json.Marshal(taskPayload)
			require.NoError(t, err)

			task = &data.Task{
				Task: &proto.Task{
					Status:    proto.TaskStatus_PENDING,
					Payload:   payloadJSON,
					CreatedAt: data.TimeNowUTCPtr(),
					RunAt:     data.TimeNowUTCPtr(),
				},
			}
		}
	}

	runner, err := jobqueue.NewConquestV2PoolRunner(poolManager)
	require.NoError(t, err)

	poolManager.EXPECT().RecalculatePool(gomock.Any())

	err = runner.RunTasks(context.Background(), nil, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)
}
