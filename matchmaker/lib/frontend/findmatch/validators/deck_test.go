package validators_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestDeckValidator(t *testing.T) {
	var openskyAPI *mock.MockSkyWeaverAPI

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			openskyAPI = mock.NewMockSkyWeaverAPI(ctrl)
		}
	}

	logger := matchmakertest.NewAssertNoErrorLogger(t)

	p := playergen.MustNew()

	deckString := "foo"
	p.DeckString = &deckString

	client := newClient(logger)
	client.SetPlayer(p)

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	validator := validators.NewDeckValidator(openskyAPI)

	t.Run("valid when deck is valid for a player", func(t *testing.T) {
		openskyAPI.EXPECT().CheckDeck(ctx, p.Address(), deckString).Return(true, nil)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when deck is invalid", func(t *testing.T) {
		openskyAPI.EXPECT().CheckDeck(ctx, p.Address(), deckString).Return(false, nil)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.ErrorContains(t, err, "invalid deck")
		assert.False(t, isValid)
	})

	t.Run("invalid when checking deck fails", func(t *testing.T) {
		openskyAPI.EXPECT().CheckDeck(ctx, p.Address(), deckString).Return(false, someError)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.ErrorIs(t, err, someError)
		assert.False(t, isValid)
	})

	t.Run("valid when deck is random", func(t *testing.T) {
		p := playergen.MustNew()

		p.IsRandomDeck = true

		client := newClient(logger)
		client.SetPlayer(p)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.NoError(t, err)
		assert.True(t, isValid)
	})
}
