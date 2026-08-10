package jobqueue_test

import (
	"context"
	"encoding/json"
	"math/big"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestOnChainPaymentEventRunner(t *testing.T) {
	var paymentEventHandler *mock.MockPaymentEventHandler

	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			accountID = apitest.RandomAccountID()
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			paymentEventHandler = mock.NewMockPaymentEventHandler(ctrl)
		}
	}

	runner := jobqueue.NewOnChainPaymentEventRunner(paymentEventHandler)

	t.Run("item purchase event", func(t *testing.T) {
		var task *data.Task

		var taskPayload jobqueue.OnChainPaymentEventTask

		// Setup
		{
			// Tasks
			{
				taskPayload = jobqueue.OnChainPaymentEventTask{
					TxHash: apitest.RandomTxnHash(),
					TransferEvent: &contracts.ERC20TransferEvent{
						To:    apitest.RandomAddress(),
						Value: big.NewInt(10),
					},
					ItemPurchaseEvent: &contracts.PaymentProxyItemPurchaseEvent{
						Spender:          apitest.RandomAddress(),
						ItemRecipient:    apitest.RandomAddress(),
						Nonce:            big.NewInt(2),
						ItemIDsPurchased: []*big.Int{big.NewInt(3)},
					},
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
		}

		paymentEventHandler.EXPECT().HandleOnChainItemPurchaseEvent(gomock.Any(), taskPayload.TxHash, taskPayload.TransferEvent, taskPayload.ItemPurchaseEvent)

		err := runner.RunTasks(context.Background(), nil, []*data.Task{task})
		require.NoError(t, err)

		assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)
	})

	t.Run("item burn event", func(t *testing.T) {
		var task *data.Task

		var taskPayload jobqueue.OnChainPaymentEventTask

		// Setup
		{
			// Tasks
			{
				taskPayload = jobqueue.OnChainPaymentEventTask{
					TxHash: apitest.RandomTxnHash(),
					TransferBatchEvent: &contracts.ERC1155TransferBatchEvent{
						To: apitest.RandomAddress(),
					},
					ItemBurnEvent: &contracts.PaymentProxyItemBurnEvent{
						Spender:          apitest.RandomAddress(),
						ItemRecipient:    apitest.RandomAddress(),
						Nonce:            big.NewInt(2),
						ItemIDsPurchased: []*big.Int{big.NewInt(3)},
					},
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
		}

		paymentEventHandler.EXPECT().HandleOnChainItemBurnEvent(gomock.Any(), taskPayload.TxHash, taskPayload.TransferBatchEvent, taskPayload.ItemBurnEvent)

		err := runner.RunTasks(context.Background(), nil, []*data.Task{task})
		require.NoError(t, err)

		assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)
	})
}
