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

func TestConquest(t *testing.T) {
	t.Run("can have more matches", func(t *testing.T) {
		t.Run("yes when there are no results", func(t *testing.T) {
			conquest1 := data.Conquest{Conquest: &proto.Conquest{
				MatchProgress: proto.ConquestMatchResultMap{},
			}}
			assert.True(t, conquest1.CanHaveMoreMatches())

			conquest2 := data.Conquest{Conquest: &proto.Conquest{}}
			assert.True(t, conquest2.CanHaveMoreMatches())
		})

		t.Run("yes when there is a draw and less then 3 wins", func(t *testing.T) {
			conquest := data.Conquest{Conquest: &proto.Conquest{
				MatchProgress: proto.ConquestMatchResultMap{
					1: proto.ConquestMatchResult_WIN,
					2: proto.ConquestMatchResult_WIN,
					3: proto.ConquestMatchResult_DRAW,
				},
			}}

			assert.True(t, conquest.CanHaveMoreMatches())
		})

		t.Run("no when there are 3 or more wins", func(t *testing.T) {
			conquest := data.Conquest{Conquest: &proto.Conquest{
				MatchProgress: proto.ConquestMatchResultMap{
					1: proto.ConquestMatchResult_WIN,
					2: proto.ConquestMatchResult_WIN,
					3: proto.ConquestMatchResult_DRAW,
					4: proto.ConquestMatchResult_WIN,
				},
			}}

			assert.False(t, conquest.CanHaveMoreMatches())
		})

		t.Run("no when there is a loss", func(t *testing.T) {
			conquest := data.Conquest{Conquest: &proto.Conquest{
				MatchProgress: proto.ConquestMatchResultMap{
					1: proto.ConquestMatchResult_WIN,
					2: proto.ConquestMatchResult_LOSS,
				},
			}}

			assert.False(t, conquest.CanHaveMoreMatches())
		})
	})
}

func TestConquestsStore(t *testing.T) {
	accountID := apitest.RandomAccountID()

	t.Run("find in progress", func(t *testing.T) {
		t.Run("returns conquest when exists", func(t *testing.T) {
			var conquest *data.Conquest
			// Setup
			{
				// Conquests
				{
					conquest = &data.Conquest{Conquest: &proto.Conquest{
						AccountID: accountID,
						Mode:      proto.GameMode_CONQUEST_CONSTRUCTED,
						Hero:      proto.Hero_ADA,
						Status:    proto.ConquestStatus_IN_PROGRESS,
					}}
					err := data.DB.Save(conquest)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.Conquests().Truncate()
						require.NoError(t, err)
					})
				}
			}

			foundConquest, err := data.DB.Conquests().FindInProgress(accountID)
			require.NoError(t, err)
			require.NotNil(t, foundConquest)

			assert.Equal(t, conquest, foundConquest)
		})

		t.Run("returns nil when does not exist", func(t *testing.T) {
			var conquest *data.Conquest
			// Setup
			{
				// Conquests
				{
					conquest = &data.Conquest{Conquest: &proto.Conquest{
						AccountID: accountID,
						Mode:      proto.GameMode_CONQUEST_CONSTRUCTED,
						Hero:      proto.Hero_ADA,
						Status:    proto.ConquestStatus_REWARDS_PENDING,
					}}
					err := data.DB.Save(conquest)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.Conquests().Truncate()
						require.NoError(t, err)
					})
				}
			}

			foundConquest, err := data.DB.Conquests().FindInProgress(accountID)
			require.NoError(t, err)
			require.Nil(t, foundConquest)
		})
	})
}
