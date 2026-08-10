package validators_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestConquestValidator(t *testing.T) {
	gameMode := proto.GameMode_CONQUEST_CONSTRUCTED

	deckClass := proto.DeckClass_STR

	minPlayerRank := proto.PlayerRank_APPRENTICE

	ctx := context.Background()

	logger := matchmakertest.NewAssertNoErrorLogger(t)

	cfg := &config.Config{
		MatchMaker: config.MatchMakerConfig{
			MinRankToPlayConquest: uint32(minPlayerRank),
		},
	}

	validator := validators.NewConquestValidator(cfg)

	t.Run("valid when rank, deck and conquest status are valid", func(t *testing.T) {
		p := playergen.MustNew(
			playergen.WithMode(gameMode),
			playergen.WithRank(minPlayerRank),
		)

		p.DeckClass = deckClass

		p.ConquestInfo = &proto.Conquest{
			Status:    proto.ConquestStatus_IN_PROGRESS,
			DeckClass: &deckClass,
		}

		client := newClient(logger)
		client.SetPlayer(p)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when deck is invalid", func(t *testing.T) {
		p := playergen.MustNew(
			playergen.WithMode(gameMode),
			playergen.WithRank(minPlayerRank),
		)

		p.DeckClass = proto.DeckClass_HRT

		p.ConquestInfo = &proto.Conquest{
			Status:    proto.ConquestStatus_IN_PROGRESS,
			DeckClass: &deckClass,
		}

		client := newClient(logger)
		client.SetPlayer(p)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.ErrorContains(t, err, "deck class is not the same as conquest deck class")
		assert.False(t, isValid)
	})

	t.Run("invalid when conquest is not in progress", func(t *testing.T) {
		p := playergen.MustNew(
			playergen.WithMode(gameMode),
			playergen.WithRank(minPlayerRank),
		)

		p.ConquestInfo = &proto.Conquest{
			Status: proto.ConquestStatus_COMPLETED,
		}

		client := newClient(logger)
		client.SetPlayer(p)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.ErrorContains(t, err, "no conquest in progress")
		assert.False(t, isValid)
	})

	t.Run("invalid when conquest is missing", func(t *testing.T) {
		p := playergen.MustNew(
			playergen.WithMode(gameMode),
			playergen.WithRank(minPlayerRank),
		)

		p.ConquestInfo = nil

		client := newClient(logger)
		client.SetPlayer(p)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.ErrorContains(t, err, "conquest info is missing")
		assert.False(t, isValid)
	})

	t.Run("invalid when rank is low", func(t *testing.T) {
		p := playergen.MustNew(
			playergen.WithMode(gameMode),
			playergen.WithRank(proto.PlayerRank_TRAINEE),
		)

		p.ConquestInfo = nil

		client := newClient(logger)
		client.SetPlayer(p)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.ErrorContains(t, err, "rank is too low")
		assert.False(t, isValid)
	})
}
