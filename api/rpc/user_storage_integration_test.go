//go:build integration

package rpc_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestUserStorageSave(t *testing.T) {
	var accountID proto.AccountID

	var analyticsTracker *analyticsMock.MockTracker

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
			analyticsTracker.EXPECT().TrackAccountCreated(gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes() // Account registration

			apiService := apitest.APIService()

			originalAnalyticsTracker := apiService.RPC.Analytics
			apiService.RPC.Analytics = analyticsTracker

			t.Cleanup(func() {
				apiService.RPC.Analytics = originalAnalyticsTracker
			})
		}

		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestUserStorageSave")
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(accountID)

	analyticsTracker.EXPECT().TrackTutorialEnd(gomock.Any(), accountID, []int{1, 2})

	resp, err := apitest.Client().UserStorageSave(ctx, "tutorial_progress", [2]int{1, 2})
	require.NoError(t, err)
	assert.True(t, resp)
}
