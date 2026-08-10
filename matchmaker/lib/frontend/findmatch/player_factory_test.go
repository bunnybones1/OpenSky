package findmatch_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPlayerFactory(t *testing.T) {
	var openskyAPI *mock.MockSkyWeaverAPI

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			openskyAPI = mock.NewMockSkyWeaverAPI(ctrl)
		}
	}

	p0 := playergen.MustNew(
		playergen.WithAddress("123"),
		playergen.WithRandomCards(2),
	)

	conquestInfo := &proto.Conquest{
		ID: 123,
	}

	quests := []*proto.Quest{
		{
			ID: 10,
		},
	}

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	factory := findmatch.NewPlayerFactory(
		matchmakertest.NewAssertNoErrorLogger(t),
		openskyAPI,
	)

	t.Run("creates player from message and fetches additional data from opensky API", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Envelope: messages.Envelope{
				Type: messages.FindMatchType,
			},
			PrivateSeed:     p0.PrivateSeed,
			SessionID:       "session",
			Mode:            proto.GameMode_RANKED_CONSTRUCTED,
			VersionHash:     "version",
			PlayerSessionID: uuid.New(),
		}

		openskyAPI.EXPECT().GetAccountWithItems(ctx, p0.Address(), *p0.DeckString, p0.PrivateSeed.Prisms).Return(p0.Account, nil)

		openskyAPI.EXPECT().ListQuests(ctx, p0.Address()).Return(quests, nil)

		p, err := factory.Create(ctx, msg)
		require.NoError(t, err)
		require.NotNil(t, p)

		assert.Equal(t, p0.Account, p.Account)
		assert.Equal(t, quests, p.Quests)
	})

	t.Run("fetches conquest info from opensky API when it is conquest", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Envelope: messages.Envelope{
				Type: messages.FindMatchType,
			},
			PrivateSeed:     p0.PrivateSeed,
			SessionID:       "session",
			Mode:            proto.GameMode_CONQUEST_CONSTRUCTED,
			VersionHash:     "version",
			PlayerSessionID: uuid.New(),
		}

		openskyAPI.EXPECT().GetAccountWithItems(ctx, p0.Address(), *p0.DeckString, p0.PrivateSeed.Prisms).Return(p0.Account, nil)

		openskyAPI.EXPECT().ListQuests(ctx, p0.Address()).Return(quests, nil)

		openskyAPI.EXPECT().GetConquestInfo(ctx, p0.Address()).Return(conquestInfo, nil)

		p, err := factory.Create(ctx, msg)
		require.NoError(t, err)
		require.NotNil(t, p)

		assert.Equal(t, conquestInfo, p.ConquestInfo)
	})

	t.Run("fails when fetching conquest info fails", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Envelope: messages.Envelope{
				Type: messages.FindMatchType,
			},
			PrivateSeed:     p0.PrivateSeed,
			SessionID:       "session",
			Mode:            proto.GameMode_CONQUEST_CONSTRUCTED,
			VersionHash:     "version",
			PlayerSessionID: uuid.New(),
		}

		openskyAPI.EXPECT().GetAccountWithItems(ctx, p0.Address(), *p0.DeckString, p0.PrivateSeed.Prisms).Return(p0.Account, nil)

		openskyAPI.EXPECT().ListQuests(ctx, p0.Address()).Return(quests, nil)

		openskyAPI.EXPECT().GetConquestInfo(ctx, p0.Address()).Return(nil, someError)

		p, err := factory.Create(ctx, msg)
		require.ErrorIs(t, err, someError)
		require.Nil(t, p)
	})

	t.Run("does not fail when listing quests fails", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Envelope: messages.Envelope{
				Type: messages.FindMatchType,
			},
			PrivateSeed:     p0.PrivateSeed,
			SessionID:       "session",
			Mode:            proto.GameMode_CONQUEST_CONSTRUCTED,
			VersionHash:     "version",
			PlayerSessionID: uuid.New(),
		}

		openskyAPI.EXPECT().GetAccountWithItems(ctx, p0.Address(), *p0.DeckString, p0.PrivateSeed.Prisms).Return(p0.Account, nil)

		openskyAPI.EXPECT().ListQuests(ctx, p0.Address()).Return(nil, someError)

		openskyAPI.EXPECT().GetConquestInfo(ctx, p0.Address()).Return(conquestInfo, nil)

		factory := findmatch.NewPlayerFactory(
			matchmakertest.NewAssertErrorContainsLogger(t, "list player quests"),
			openskyAPI,
		)

		p, err := factory.Create(ctx, msg)
		require.NoError(t, err)
		require.NotNil(t, p)

		assert.Equal(t, conquestInfo, p.ConquestInfo)
		assert.Empty(t, p.Quests)
	})

	t.Run("fails when account info from opensky API is nil", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Envelope: messages.Envelope{
				Type: messages.FindMatchType,
			},
			PrivateSeed:     p0.PrivateSeed,
			SessionID:       "session",
			Mode:            proto.GameMode_RANKED_CONSTRUCTED,
			VersionHash:     "version",
			PlayerSessionID: uuid.New(),
		}

		openskyAPI.EXPECT().GetAccountWithItems(ctx, p0.Address(), *p0.DeckString, p0.PrivateSeed.Prisms).Return(nil, nil)

		p, err := factory.Create(ctx, msg)
		require.ErrorContains(t, err, "has not been found")
		require.Nil(t, p)
	})

	t.Run("fails when fetching account info fails", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Envelope: messages.Envelope{
				Type: messages.FindMatchType,
			},
			PrivateSeed:     p0.PrivateSeed,
			SessionID:       "session",
			Mode:            proto.GameMode_RANKED_CONSTRUCTED,
			VersionHash:     "version",
			PlayerSessionID: uuid.New(),
		}

		openskyAPI.EXPECT().GetAccountWithItems(ctx, p0.Address(), *p0.DeckString, p0.PrivateSeed.Prisms).Return(nil, someError)

		p, err := factory.Create(ctx, msg)
		require.ErrorIs(t, err, someError)
		require.Nil(t, p)
	})
}
