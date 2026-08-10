package matchers_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPlayerCombinator(t *testing.T) {
	var botMatchValidator, matchValidator1, matchValidator2 *mock.MockMatchValidator

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			botMatchValidator = mock.NewMockMatchValidator(ctrl)
			matchValidator1 = mock.NewMockMatchValidator(ctrl)
			matchValidator2 = mock.NewMockMatchValidator(ctrl)
		}
	}

	p1 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
		playergen.WithInitTimestamp(time.Now().Add(-2*time.Minute)),
	)

	p2 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
		playergen.WithInitTimestamp(time.Now().Add(-2*time.Minute)),
	)

	b1 := player.NewBotPlayer(proto.GameMode_RANKED_CONSTRUCTED)

	require.True(t, b1.IsBot())

	combinator := matchers.NewPlayerCombinator(zerolog.Nop(), botMatchValidator, matchValidator1, matchValidator2)

	t.Run("combines valid pairs of players", func(t *testing.T) {
		botMatchValidator.EXPECT().IsValid(p1, b1).Return(true, nil)
		botMatchValidator.EXPECT().IsValid(p2, b1).Return(true, nil)
		matchValidator1.EXPECT().IsValid(p1, p2).Return(true, nil)
		matchValidator2.EXPECT().IsValid(p1, p2).Return(true, nil)

		combinations, err := combinator.Combine([]*player.Player{p1, p2, b1})
		require.NoError(t, err)

		require.Len(t, combinations.Players(), 3)
		checkPlayerInCandidates(t, combinations.Candidates(p1), p2, b1)
		checkPlayerInCandidates(t, combinations.Candidates(p2), p1, b1)
		checkPlayerInCandidates(t, combinations.Candidates(b1), p1, p2)
	})

	t.Run("sorts players by wait time", func(t *testing.T) {
		matchValidator1.EXPECT().IsValid(p1, p2).Return(true, nil)
		matchValidator2.EXPECT().IsValid(p1, p2).Return(true, nil)

		combinations, err := combinator.Combine([]*player.Player{p2, p1})
		require.NoError(t, err)

		require.Len(t, combinations.Players(), 2)
		assert.Equal(t, p1, combinations.Players()[0])
		assert.Equal(t, p2, combinations.Players()[1])
	})

	t.Run("pair is invalid when any of validators is invalid", func(t *testing.T) {
		matchValidator1.EXPECT().IsValid(p1, p2).Return(true, nil)
		matchValidator2.EXPECT().IsValid(p1, p2).Return(false, nil)

		combinations, err := combinator.Combine([]*player.Player{p1, p2})
		require.NoError(t, err)

		assert.Len(t, combinations.Players(), 0)
	})

	t.Run("pair is invalid and it does not fail when any of validators fails", func(t *testing.T) {
		matchValidator1.EXPECT().IsValid(p1, p2).Return(true, nil)
		matchValidator2.EXPECT().IsValid(p1, p2).Return(false, fmt.Errorf("error"))

		combinations, err := combinator.Combine([]*player.Player{p1, p2})
		require.NoError(t, err)

		assert.Len(t, combinations.Players(), 0)
	})

	t.Run("pair with bot is invalid when bot validation is invalid", func(t *testing.T) {
		botMatchValidator.EXPECT().IsValid(p1, b1).Return(false, nil)

		combinations, err := combinator.Combine([]*player.Player{p1, b1})
		require.NoError(t, err)

		assert.Len(t, combinations.Players(), 0)
	})

	t.Run("pair with bot is invalid and it does not fail when bot validation fails", func(t *testing.T) {
		botMatchValidator.EXPECT().IsValid(p1, b1).Return(false, fmt.Errorf("error"))

		combinations, err := combinator.Combine([]*player.Player{p1, b1})
		require.NoError(t, err)

		assert.Len(t, combinations.Players(), 0)
	})

	t.Run("pair is invalid when players are the same", func(t *testing.T) {
		combinations, err := combinator.Combine([]*player.Player{p1, p1})
		require.NoError(t, err)

		assert.Len(t, combinations.Players(), 0)
	})

	t.Run("fails when there are less than 2 players", func(t *testing.T) {
		combinations, err := combinator.Combine([]*player.Player{p1})
		require.ErrorContains(t, err, "expecting at least 2 players")
		assert.Nil(t, combinations)
	})
}

func checkPlayerInCandidates(t *testing.T, candidates []*player.Player, players ...*player.Player) {
	for _, p := range players {
		var found bool

		for _, candidate := range candidates {
			if candidate.Address() == p.Address() {
				found = true
				break
			}
		}

		require.True(t, found)
	}
}

func TestPlayerCombinationMap(t *testing.T) {
	p1 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	p2 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	p3 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	// Add players
	combinations := matchers.NewPlayerCombinationMap()
	combinations.Add(p1, p2)
	combinations.Add(p1, p3)
	combinations.Add(p2, p1)
	combinations.Add(p2, p3)
	combinations.Add(p3, p1)
	combinations.Add(p3, p2)

	// Check all players with candidates are there
	require.Len(t, combinations.Players(), 3)
	assert.Len(t, combinations.Candidates(p1), 2)
	checkPlayerInCandidates(t, combinations.Candidates(p1), p2, p3)
	assert.Len(t, combinations.Candidates(p2), 2)
	checkPlayerInCandidates(t, combinations.Candidates(p2), p1, p3)
	assert.Len(t, combinations.Candidates(p3), 2)
	checkPlayerInCandidates(t, combinations.Candidates(p3), p1, p2)

	// Remove one player
	combinations.Remove(p1)

	// Check remaining players are there and candidates of remaining players are without removed player
	require.Len(t, combinations.Players(), 2)
	assert.Len(t, combinations.Candidates(p1), 0)
	assert.Len(t, combinations.Candidates(p2), 1)
	checkPlayerInCandidates(t, combinations.Candidates(p2), p3)
	assert.Len(t, combinations.Candidates(p3), 1)
	checkPlayerInCandidates(t, combinations.Candidates(p3), p2)

	// Remove the last but one player
	combinations.Remove(p3)

	// Check no players and no candidates are there including the one that has not been removed yet
	require.Len(t, combinations.Players(), 0)
	assert.Len(t, combinations.Candidates(p1), 0)
	assert.Len(t, combinations.Candidates(p2), 0)
	assert.Len(t, combinations.Candidates(p3), 0)
}
