//go:build integration

package rpc_test

import (
	"testing"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAppDevKeys(t *testing.T) {
	var adminAccountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error
			adminAccountID, err = apitest.CreateRandomAdminAccount("GMGameModeSet")
			require.NoError(t, err)
		}
		// Clean-up
		{
			_, err := data.DB.SQL().Exec("TRUNCATE app_dev_keys CASCADE")
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	t.Run("validate", func(t *testing.T) {
		{
			_, err := apitest.Client().GMCreateAppDevKey(ctx, &proto.CreateAppDevKeyRequest{})
			assert.Error(t, err, "no data provided")
		}

		{
			_, err := apitest.Client().GMCreateAppDevKey(ctx, &proto.CreateAppDevKeyRequest{
				Email: "somebody@example.org",
			})
			assert.Error(t, err)
		}
	})

	t.Run("create and verify", func(t *testing.T) {
		req := proto.CreateAppDevKeyRequest{
			Name:  "new name",
			Email: "somebody@example.org",
		}
		res, err := apitest.Client().GMCreateAppDevKey(ctx, &req)
		assert.NoError(t, err)

		appDevKeyID := res.ID

		assert.Equal(t, req.Name, res.Name)
		assert.Equal(t, req.Email, res.Email)
		assert.False(t, res.Disabled)
		require.NotNil(t, res.CreatedBy)
		assert.NotZero(t, res.AppKey)
		assert.NotZero(t, *res.CreatedBy)
		assert.NotZero(t, res.CreatedAt)
		assert.NotZero(t, res.UpdatedAt)
		assert.Len(t, res.AppKey, 32)

		appDevKey, _, err := apitest.Client().GMGetAppDevKeyToken(ctx, appDevKeyID)
		assert.NoError(t, err)

		assert.Equal(t, req.Name, appDevKey.Name)
		assert.Equal(t, req.Email, appDevKey.Email)
		assert.False(t, appDevKey.Disabled)
	})

	t.Run("refuse to create a duplicate", func(t *testing.T) {
		{
			_, err := apitest.Client().GMCreateAppDevKey(ctx, &proto.CreateAppDevKeyRequest{
				Name:  "duplicated",
				Email: "duplicated-1@example.org",
			})
			assert.NoError(t, err)
		}

		{
			_, err := apitest.Client().GMCreateAppDevKey(ctx, &proto.CreateAppDevKeyRequest{
				Name:  "duplicated-1",
				Email: "duplicated-1@example.org",
			})
			assert.Error(t, err)
		}
	})

	t.Run("disable and re-enable", func(t *testing.T) {
		var devKeyID uint64
		var devKeyID2 uint64

		{
			appDevKey, err := apitest.Client().GMCreateAppDevKey(ctx, &proto.CreateAppDevKeyRequest{
				Name:  "name-3",
				Email: "name-3@example.org",
			})
			assert.NoError(t, err)
			assert.False(t, appDevKey.Disabled)

			devKeyID = appDevKey.ID
		}

		{
			ok, err := apitest.Client().GMDisableAppDevKey(ctx, devKeyID)
			assert.NoError(t, err)
			assert.True(t, ok)

			_, _, err = apitest.Client().GMGetAppDevKeyToken(ctx, devKeyID)
			assert.Error(t, err)
		}

		{
			ok, err := apitest.Client().GMDisableAppDevKey(ctx, devKeyID)
			assert.NoError(t, err)
			assert.True(t, ok)
		}

		// now that the key is disabled, create another key with the same name
		{
			appDevKey, err := apitest.Client().GMCreateAppDevKey(ctx, &proto.CreateAppDevKeyRequest{
				Name:  "name-3",
				Email: "name-3@example.org",
			})
			assert.NoError(t, err)

			devKeyID2 = appDevKey.ID
		}

		// Attempt to re-enable first key
		{
			ok, err := apitest.Client().GMEnableAppDevKey(ctx, devKeyID)
			assert.Error(t, err)
			assert.False(t, ok)
		}

		// Disable second key
		{
			ok, err := apitest.Client().GMDisableAppDevKey(ctx, devKeyID2)
			assert.NoError(t, err)
			assert.True(t, ok)
		}

		// Attempt to re-enable first key
		{
			ok, err := apitest.Client().GMEnableAppDevKey(ctx, devKeyID)
			assert.NoError(t, err)
			assert.True(t, ok)
		}
	})

	t.Run("list", func(t *testing.T) {
		{
			_, appDevKeys, err := apitest.Client().GMListAppDevKeys(ctx, nil)
			assert.NoError(t, err)
			assert.NotZero(t, len(appDevKeys))

			for _, devKey := range appDevKeys {
				assert.NotZero(t, devKey.Name)
				assert.NotZero(t, devKey.AppKey)
				assert.NotZero(t, devKey.Email)
			}
		}
	})

	t.Run("generate token", func(t *testing.T) {
		appDevKey, err := apitest.Client().GMCreateAppDevKey(ctx, &proto.CreateAppDevKeyRequest{
			Name:  "name-5",
			Email: "name-5@example.org",
		})
		assert.NoError(t, err)

		_, token, err := apitest.Client().GMGetAppDevKeyToken(ctx, appDevKey.ID)
		assert.NoError(t, err)
		assert.NotZero(t, token)
	})

}
