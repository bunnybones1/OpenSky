//go:build integration

package conquest_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/conquest"
	"github.com/horizon-games/OpenSky/api/lib/conquest/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestAccountStatUpdater(t *testing.T) {
	var scoreCalculator *mock.MockScoreCalculator

	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestAccountStatUpdater")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			scoreCalculator = mock.NewMockScoreCalculator(ctrl)
		}
	}

	ctx := apitest.DBContext(context.Background())
	sess := data.DB.Session

	accountStateUpdater := conquest.NewAccountStatUpdater(scoreCalculator)

	t.Run("success", func(t *testing.T) {
		account := &data.Account{Account: &proto.Account{ID: accountID}}

		scoreCalculator.EXPECT().FromPastMatches(gomock.Any(), accountID).Return(int32(-2))

		err := accountStateUpdater.RecalculateScore(ctx, sess, proto.GameMode_CONQUEST_CONSTRUCTED, 1, account)
		require.NoError(t, err)

		stat, err := data.DB.AccountStats(nil).FindByAccountIDAndMode(accountID, proto.GameMode_CONQUEST_CONSTRUCTED, 1)
		require.NoError(t, err)

		assert.NotNil(t, stat)
		assert.Equal(t, int32(-2), *stat.Score)
	})

	t.Run("fails when the mode is not a conquest", func(t *testing.T) {
		modes := []proto.GameMode{
			proto.GameMode_RANKED_CONSTRUCTED,
			proto.GameMode_RANKED_DISCOVERY,
			proto.GameMode_CHALLENGE_CONSTRUCTED,
			proto.GameMode_CHALLENGE_DISCOVERY,
		}

		for _, mode := range modes {
			account := &data.Account{Account: &proto.Account{ID: accountID}}

			err := accountStateUpdater.RecalculateScore(ctx, sess, mode, 1, account)
			require.ErrorContains(t, err, "only conquest mode is supported")
		}
	})
}
