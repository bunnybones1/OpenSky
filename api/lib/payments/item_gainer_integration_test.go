//go:build integration

package payments_test

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/payments"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestItemGainer(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestItemGainer")
			require.NoError(t, err)
		}
	}

	paymentProvider := proto.PaymentProvider_GOOGLE_PLAY

	payment := &data.Payment{
		Payment: &proto.Payment{
			ID:        2,
			AccountID: accountID,
			Provider:  &paymentProvider,
		},
	}

	gainer := payments.NewItemGainer()

	t.Run("conquest ticket", func(t *testing.T) {
		tokenID := data.ConquestTicketTokenID
		amount := int64(2)

		t.Run("success", func(t *testing.T) {
			// Setup
			{
				t.Cleanup(func() {
					err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			err := gainer.Gain(data.DB.Session, payment, tokenID, amount)
			require.NoError(t, err)

			conquestTickets, err := data.DB.Items().GetConquestTickets(accountID)
			require.NoError(t, err)
			assert.Equal(t, amount, int64(conquestTickets))
		})

		t.Run("does not gain item when the session fails", func(t *testing.T) {
			_ = data.DB.Tx(func(sess db.Session) error {
				err := gainer.Gain(sess, payment, tokenID, amount)
				require.NoError(t, err)

				return fmt.Errorf("some error")
			})

			conquestTickets, err := data.DB.Items().GetConquestTickets(accountID)
			require.NoError(t, err)
			assert.Equal(t, 0, int(conquestTickets))
		})

		t.Run("fails when token ID is invalid", func(t *testing.T) {
			tokenID := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_CONQUEST_TICKET, 1)
			err := gainer.Gain(data.DB.Session, payment, tokenID, amount)
			require.ErrorContains(t, err, "invalid token for conquest ticket")
		})
	})

	t.Run("skypass", func(t *testing.T) {
		t.Run("success", func(t *testing.T) {
			// Setup
			{
				t.Cleanup(func() {
					err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			season := data.CurrentSeason()
			tokenID := data.SkypassTokenID(season)

			err := gainer.Gain(data.DB.Session, payment, tokenID, 1)
			require.NoError(t, err)

			item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_SKYPASS, uint64(season))
			require.NoError(t, err)
			require.NotNil(t, item)

			assert.Equal(t, 1, int(item.Balance.Int64()))

			skypassSeasonStats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, skypassSeasonStats)

			assert.True(t, skypassSeasonStats.HasPremium)
		})

		t.Run("does not fail nor gain item when the item already exists", func(t *testing.T) {
			season := data.CurrentSeason()
			tokenID := data.SkypassTokenID(season)

			// Setup
			{
				// Items
				{
					item := &data.Item{
						Item: &proto.Item{
							AccountID: accountID,
							ItemType:  proto.ItemType_SW_SKYPASS,
							TokenID:   uint64(season),
							Balance:   prototyp.NewBigInt(1),
						},
					}
					err := data.DB.Save(item)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}

				t.Cleanup(func() {
					err := data.DB.SkypassSeasonStats().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			err := gainer.Gain(data.DB.Session, payment, tokenID, 1)
			require.NoError(t, err)

			item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_SKYPASS, uint64(season))
			require.NoError(t, err)
			require.NotNil(t, item)

			assert.Equal(t, 1, int(item.Balance.Int64()))

			skypassSeasonStats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, skypassSeasonStats)

			assert.True(t, skypassSeasonStats.HasPremium)
		})

		t.Run("does not gain item when the session fails", func(t *testing.T) {
			season := data.CurrentSeason()
			tokenID := data.SkypassTokenID(season)

			_ = data.DB.Tx(func(sess db.Session) error {
				err := gainer.Gain(sess, payment, tokenID, 1)
				require.NoError(t, err)

				return fmt.Errorf("some error")
			})

			item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_SKYPASS, uint64(season))
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, item)

			skypassSeasonStats, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
			require.NoError(t, err)
			require.NotNil(t, skypassSeasonStats)

			assert.False(t, skypassSeasonStats.HasPremium)
		})

		t.Run("fails when token ID is not valid for current season", func(t *testing.T) {
			season := data.CurrentSeason() - 1
			tokenID := data.SkypassTokenID(season)

			err := gainer.Gain(data.DB.Session, payment, tokenID, 1)
			require.ErrorContains(t, err, "invalid season for skypass")
		})
	})

	t.Run("fails when unsupported item type is given", func(t *testing.T) {
		err := gainer.Gain(data.DB.Session, payment, 123, 1)
		require.ErrorContains(t, err, "unsupported item type")
	})
}

func getMintConquestEntriesTask(accountID proto.AccountID) (*data.Task, *jobqueue.MintConquestEntriesTask, error) {
	var task *data.Task

	err := data.DB.Tasks().Find(db.Cond{
		"account_id": accountID,
		"queue":      jobqueue.MintConquestEntriesQueue,
	}).One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var payload *jobqueue.MintConquestEntriesTask

	err = json.Unmarshal(task.Payload, &payload)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, payload, nil
}
