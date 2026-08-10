package gamemodechecker_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gamemodechecker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gamemodechecker/mock"
)

func TestChecker(t *testing.T) {
	var openskyAPI *mock.MockSkyWeaverAPI

	var cacheStore *mock.MockStore[[]byte]

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			openskyAPI = mock.NewMockSkyWeaverAPI(ctrl)
			cacheStore = mock.NewMockStore[[]byte](ctrl)
		}
	}

	gameModesStatus := &proto.GameModesStatus{
		Tutorial:             false,
		PracticePVP:          false,
		PracticeBot:          false,
		WarmUp:               false,
		RankedConstructed:    false,
		RankedDiscovery:      false,
		ConquestConstructed:  false,
		ConquestDiscovery:    false,
		ChallengeConstructed: false,
		ChallengeDiscovery:   false,
	}

	bytesGameModesStatus, err := json.Marshal(gameModesStatus)
	require.NoError(t, err)

	cfg := &config.Config{
		SkyWeaverAPI: config.SkyWeaverAPIConfig{
			GameModesStatusCacheTTL: time.Minute,
		},
	}

	checker := gamemodechecker.NewChecker(cfg, zerolog.Nop(), openskyAPI, cacheStore)

	t.Run("uses value from the API response and caches it", func(t *testing.T) {
		modes := []proto.GameMode{
			proto.GameMode_TUTORIAL,
			proto.GameMode_PRACTICE_BOT,
			proto.GameMode_WARM_UP,
			proto.GameMode_RANKED_CONSTRUCTED,
			proto.GameMode_RANKED_DISCOVERY,
			proto.GameMode_CONQUEST_CONSTRUCTED,
			proto.GameMode_CONQUEST_DISCOVERY,
			proto.GameMode_CHALLENGE_CONSTRUCTED,
			proto.GameMode_CHALLENGE_DISCOVERY,
		}

		cacheStore.EXPECT().Get(gomock.Any(), "cachedGameModesStatus").Return(nil, false, nil)
		cacheStore.EXPECT().SetEx(gomock.Any(), "cachedGameModesStatus", bytesGameModesStatus, time.Minute).Return(nil)
		cacheStore.EXPECT().Get(gomock.Any(), "cachedGameModesStatus").Times(len(modes)-1).Return(bytesGameModesStatus, true, nil)

		openskyAPI.EXPECT().GetGameModesStatus(gomock.Any()).Return(gameModesStatus, nil)

		for _, mode := range modes {
			status, err := checker.IsEnabled(context.Background(), mode)
			require.NoError(t, err)
			assert.False(t, status)
		}
	})

	t.Run("fails when API call fails", func(t *testing.T) {
		someError := fmt.Errorf("some error")

		cacheStore.EXPECT().Get(gomock.Any(), "cachedGameModesStatus").Return(nil, false, nil)

		openskyAPI.EXPECT().GetGameModesStatus(gomock.Any()).Return(nil, someError)

		status, err := checker.IsEnabled(context.Background(), proto.GameMode_RANKED_CONSTRUCTED)
		require.ErrorIs(t, err, someError)
		assert.False(t, status)
	})

	t.Run("does API call and does not fail when get from cache store fails", func(t *testing.T) {
		someError := fmt.Errorf("some error")

		cacheStore.EXPECT().Get(gomock.Any(), "cachedGameModesStatus").Return(nil, false, someError)
		cacheStore.EXPECT().SetEx(gomock.Any(), "cachedGameModesStatus", bytesGameModesStatus, time.Minute).Return(nil)

		openskyAPI.EXPECT().GetGameModesStatus(gomock.Any()).Return(gameModesStatus, nil)

		status, err := checker.IsEnabled(context.Background(), proto.GameMode_RANKED_CONSTRUCTED)
		require.NoError(t, err)
		assert.False(t, status)
	})

	t.Run("does API call and does not fail when decoding data from cache store fails", func(t *testing.T) {
		cacheStore.EXPECT().Get(gomock.Any(), "cachedGameModesStatus").Return([]byte(`abc`), true, nil)
		cacheStore.EXPECT().SetEx(gomock.Any(), "cachedGameModesStatus", bytesGameModesStatus, time.Minute).Return(nil)

		openskyAPI.EXPECT().GetGameModesStatus(gomock.Any()).Return(gameModesStatus, nil)

		status, err := checker.IsEnabled(context.Background(), proto.GameMode_RANKED_CONSTRUCTED)
		require.NoError(t, err)
		assert.False(t, status)
	})

	t.Run("does not fail when set to cache store fails", func(t *testing.T) {
		someError := fmt.Errorf("some error")

		cacheStore.EXPECT().Get(gomock.Any(), "cachedGameModesStatus").Return(nil, false, nil)
		cacheStore.EXPECT().SetEx(gomock.Any(), "cachedGameModesStatus", bytesGameModesStatus, time.Minute).Return(someError)

		openskyAPI.EXPECT().GetGameModesStatus(gomock.Any()).Return(gameModesStatus, nil)

		status, err := checker.IsEnabled(context.Background(), proto.GameMode_RANKED_CONSTRUCTED)
		require.NoError(t, err)
		assert.False(t, status)
	})

	t.Run("returns default true when the mode is not supported", func(t *testing.T) {
		cacheStore.EXPECT().Get(gomock.Any(), "cachedGameModesStatus").Return(bytesGameModesStatus, true, nil)

		status, err := checker.IsEnabled(context.Background(), proto.GameMode_UNKNOWN)
		require.NoError(t, err)
		assert.True(t, status)
	})
}
