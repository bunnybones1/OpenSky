package jobqueue_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestStripeEventRunner(t *testing.T) {
	var paymentEventHandler *mock.MockPaymentEventHandler

	var task *data.Task

	var taskPayload jobqueue.StripeEventTask

	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			accountID = apitest.RandomAccountID()
		}

		// Tasks
		{
			taskPayload = jobqueue.StripeEventTask{
				EventID: "event-id-1",
			}

			payloadJSON, err := json.Marshal(taskPayload)
			require.NoError(t, err)

			task = &data.Task{
				Task: &proto.Task{
					Status:    proto.TaskStatus_PENDING,
					Payload:   payloadJSON,
					CreatedAt: data.TimeNowUTCPtr(),
					RunAt:     data.TimeNowUTCPtr(),
					AccountID: &accountID,
				},
			}
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			paymentEventHandler = mock.NewMockPaymentEventHandler(ctrl)
		}
	}

	runner := jobqueue.NewStripeEventRunner(paymentEventHandler)

	paymentEventHandler.EXPECT().HandleStripeEvent(gomock.Any(), taskPayload.EventID)

	err := runner.RunTasks(context.Background(), nil, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)
}
