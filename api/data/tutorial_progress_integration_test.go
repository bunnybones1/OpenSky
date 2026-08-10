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

func TestTutorialProgress(t *testing.T) {
	accountID, _, err := apitest.CreateRandomAccount("TestTutorialProgress")
	require.NoError(t, err)

	t.Run("store and retrieve", func(t *testing.T) {
		t.Cleanup(func() {
			err := data.DB.TutorialProgress().Truncate()
			require.NoError(t, err)
		})

		t.Run("get an invalid tutorial", func(t *testing.T) {
			completed, err := data.DB.TutorialProgress().IsCompleted(accountID, proto.TutorialLevel_UNKNOWN)
			assert.Error(t, err)
			assert.False(t, completed)
		})

		t.Run("get a valid tutorial", func(t *testing.T) {
			completed, err := data.DB.TutorialProgress().IsCompleted(accountID, proto.TutorialLevel_LEVEL_1)
			assert.NoError(t, err)
			assert.False(t, completed)
		})

		t.Run("record an invalid tutorial", func(t *testing.T) {
			err := data.DB.TutorialProgress().RecordProgress(accountID, proto.TutorialLevel_UNKNOWN)
			assert.Error(t, err)
		})

		t.Run("record a valid tutorial", func(t *testing.T) {
			err := data.DB.TutorialProgress().RecordProgress(accountID, proto.TutorialLevel_LEVEL_1)
			assert.NoError(t, err)
		})

		t.Run("record a valid tutorial and retrieve the status", func(t *testing.T) {
			err := data.DB.TutorialProgress().RecordProgress(accountID, proto.TutorialLevel_LEVEL_2)
			assert.NoError(t, err)

			completed, err := data.DB.TutorialProgress().IsCompleted(accountID, proto.TutorialLevel_LEVEL_2)
			assert.NoError(t, err)
			assert.True(t, completed)
		})
	})
}
