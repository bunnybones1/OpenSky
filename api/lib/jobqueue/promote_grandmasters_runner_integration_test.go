//go:build integration

package jobqueue_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	gomock "go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/rankup/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestPromoteGrandmastersRunner(t *testing.T) {
	season := data.CurrentSeason()

	// Task
	taskPayload := jobqueue.PromoteGrandmastersTask{
		GameMode: proto.GameMode_RANKED_DISCOVERY,
		Season:   season,
		MatchID:  1,
	}

	payloadJSON, err := json.Marshal(taskPayload)
	require.NoError(t, err)

	// Run mock task
	t.Run("make sure Update is called with the right arguments from the payload", func(t *testing.T) {
		ctrl := gomock.NewController(t)

		mockUpdater := mock.NewMockGrandmasterUpdater(ctrl)

		mockUpdater.EXPECT().Update(gomock.Any(), proto.GameMode_RANKED_DISCOVERY, season)

		runner := jobqueue.NewPromoteGrandmastersRunner(mockUpdater)

		ctx := context.Background()

		task := &data.Task{
			Task: &proto.Task{
				Status:    proto.TaskStatus_PENDING,
				Payload:   payloadJSON,
				CreatedAt: data.TimeNowUTCPtr(),
				RunAt:     data.TimeNowUTCPtr(),
			},
		}

		err = runner.RunTasks(ctx, data.DB.Session, []*data.Task{task})
		require.NoError(t, err)

		assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)
	})
}
