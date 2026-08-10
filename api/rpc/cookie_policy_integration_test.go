//go:build integration

package rpc_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestCookiePolicy(t *testing.T) {
	t.Run("empty policy defaults", func(t *testing.T) {
		accountID, _, err := apitest.CreateRandomAccount("TestEmptyPolicyDefaults")
		require.NoError(t, err)

		ctx := apitest.AccountContext(accountID)

		// Test empty default policies
		policies, err := apitest.Client().GetCookiePolicy(ctx)
		assert.NoError(t, err)
		assert.Equal(t, len(policies), 0)
	})

	t.Run("policies for an unknown account", func(t *testing.T) {
		account, allowsTracking, err := data.DB.CookiePolicies().GetAnalyticsPolicyByAccountID(42)
		require.Error(t, err)
		require.False(t, allowsTracking)
		require.Nil(t, account)
	})

	t.Run("save defaults", func(t *testing.T) {
		accountID, _, err := apitest.CreateRandomAccount("TestSaveDefaults")
		require.NoError(t, err)

		ctx := apitest.AccountContext(accountID)

		status, err := apitest.Client().SaveCookiePolicy(ctx, map[string]bool{})
		assert.NoError(t, err)
		assert.True(t, status)

		policies, err := apitest.Client().GetCookiePolicy(ctx)
		assert.NoError(t, err)
		assert.Equal(t, len(policies), 4)
		assert.True(t, policies[proto.CookiePolicyOption_AUTHENTICATION.String()])
		assert.True(t, policies[proto.CookiePolicyOption_MARKETPLACE.String()])
		assert.True(t, policies[proto.CookiePolicyOption_GEO_BLOCKING.String()])
		assert.False(t, policies[proto.CookiePolicyOption_PRODUCT_ANALYTICS.String()])

		account, allowsTracking, err := data.DB.CookiePolicies().GetAnalyticsPolicyByAccountID(accountID)
		require.NoError(t, err)
		require.False(t, allowsTracking)
		assert.Equal(t, accountID, account.ID)
	})

	t.Run("save success", func(t *testing.T) {
		accountID, _, err := apitest.CreateRandomAccount("TestSaveSuccess")
		require.NoError(t, err)

		ctx := apitest.AccountContext(accountID)

		status, err2 := apitest.Client().SaveCookiePolicy(ctx, map[string]bool{
			proto.CookiePolicyOption_PRODUCT_ANALYTICS.String(): true,
		})
		assert.NoError(t, err2)
		assert.True(t, status)

		policies, er := apitest.Client().GetCookiePolicy(ctx)
		assert.NoError(t, er)
		assert.Equal(t, len(policies), 4)
		assert.True(t, policies[proto.CookiePolicyOption_AUTHENTICATION.String()])
		assert.True(t, policies[proto.CookiePolicyOption_MARKETPLACE.String()])
		assert.True(t, policies[proto.CookiePolicyOption_GEO_BLOCKING.String()])
		assert.True(t, policies[proto.CookiePolicyOption_PRODUCT_ANALYTICS.String()])

		{
			account, allowsTracking, err := data.DB.CookiePolicies().GetAnalyticsPolicyByAccountID(accountID)
			require.NoError(t, err)
			require.True(t, allowsTracking)
			assert.Equal(t, accountID, account.ID)
		}

		status, er = apitest.Client().SaveCookiePolicy(ctx, map[string]bool{})
		assert.NoError(t, er)
		assert.True(t, status)
		policies, er = apitest.Client().GetCookiePolicy(ctx)
		assert.NoError(t, er)
		assert.Equal(t, len(policies), 4)
		assert.True(t, policies[proto.CookiePolicyOption_AUTHENTICATION.String()])
		assert.True(t, policies[proto.CookiePolicyOption_MARKETPLACE.String()])
		assert.True(t, policies[proto.CookiePolicyOption_GEO_BLOCKING.String()])
		assert.False(t, policies[proto.CookiePolicyOption_PRODUCT_ANALYTICS.String()])

		{
			account, allowsTracking, err := data.DB.CookiePolicies().GetAnalyticsPolicyByAccountID(accountID)
			require.NoError(t, err)
			require.False(t, allowsTracking)
			assert.Equal(t, accountID, account.ID)
		}
	})

	t.Run("non modifiable options", func(t *testing.T) {
		accountID, _, err := apitest.CreateRandomAccount("TestNonModifiableOptions")
		require.NoError(t, err)

		ctx := apitest.AccountContext(accountID)

		status, err2 := apitest.Client().SaveCookiePolicy(ctx, map[string]bool{
			proto.CookiePolicyOption_AUTHENTICATION.String():    false,
			proto.CookiePolicyOption_PRODUCT_ANALYTICS.String(): false,
		})
		assert.NoError(t, err2)
		assert.True(t, status)

		policies, er := apitest.Client().GetCookiePolicy(ctx)
		assert.NoError(t, er)
		assert.Equal(t, len(policies), 4)
		assert.True(t, policies[proto.CookiePolicyOption_AUTHENTICATION.String()])
		assert.True(t, policies[proto.CookiePolicyOption_MARKETPLACE.String()])
		assert.True(t, policies[proto.CookiePolicyOption_GEO_BLOCKING.String()])
		assert.False(t, policies[proto.CookiePolicyOption_PRODUCT_ANALYTICS.String()])
	})

	t.Run("invalid policies", func(t *testing.T) {
		accountID, _, err := apitest.CreateRandomAccount("TestInvalidPolicies")
		require.NoError(t, err)

		ctx := apitest.AccountContext(accountID)

		status, err := apitest.Client().SaveCookiePolicy(
			ctx,
			map[string]bool{
				"hello":          false,
				"does_not_exist": true,
			})
		assert.Error(t, err)
		assert.False(t, status)

		status, err = apitest.Client().SaveCookiePolicy(
			ctx,
			map[string]bool{
				proto.CookiePolicyOption_PRODUCT_ANALYTICS.String(): true,
				"does_not_exist": true,
			})
		assert.Error(t, err)
		assert.False(t, status)
	})

	t.Run("remove dups", func(t *testing.T) {
		accountID, _, err := apitest.CreateRandomAccount("TestRemoveDups")
		require.NoError(t, err)

		ctx := apitest.AccountContext(accountID)

		status, err2 := apitest.Client().SaveCookiePolicy(
			ctx,
			map[string]bool{
				proto.CookiePolicyOption_PRODUCT_ANALYTICS.String(): true,
				proto.CookiePolicyOption_PRODUCT_ANALYTICS.String(): true,
			})
		assert.NoError(t, err2)
		assert.True(t, status)

		policies, er := apitest.Client().GetCookiePolicy(ctx)
		assert.NoError(t, er)
		assert.Equal(t, len(policies), 4)
		assert.True(t, policies[proto.CookiePolicyOption_AUTHENTICATION.String()])
		assert.True(t, policies[proto.CookiePolicyOption_MARKETPLACE.String()])
		assert.True(t, policies[proto.CookiePolicyOption_GEO_BLOCKING.String()])
		assert.True(t, policies[proto.CookiePolicyOption_PRODUCT_ANALYTICS.String()])
	})
}
