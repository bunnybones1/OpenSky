//go:build integration

package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestAccountsStore(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestAccountsStore")
			require.NoError(t, err)
		}
	}

	account, err := data.DB.Accounts().FindByID(accountID)
	require.NoError(t, err)
	require.NotNil(t, account)
	assert.Zero(t, account.Level)

	err = data.DB.Accounts().UpdateLevel(accountID, 10)
	require.NoError(t, err)

	account, err = data.DB.Accounts().FindByID(accountID)
	require.NoError(t, err)
	require.NotNil(t, account)
	assert.Equal(t, 10, int(account.Level))

	err = data.DB.Accounts().UpdateLevel(accountID, 15)
	require.NoError(t, err)

	account, err = data.DB.Accounts().FindByID(accountID)
	require.NoError(t, err)
	require.NotNil(t, account)
	assert.Equal(t, 15, int(account.Level))
}
