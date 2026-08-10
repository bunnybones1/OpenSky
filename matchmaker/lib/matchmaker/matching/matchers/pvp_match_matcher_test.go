package matchers_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/mock"
	matchmakermock "github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPVPMatchMatcher(t *testing.T) {
	var queryService *matchmakermock.MockQueryService

	var playerValidator *mock.MockPlayerValidator

	var botFactory *mock.MockBotFactory

	var playerCombinator *mock.MockPlayerCombinator

	var matchQualitySorter *mock.MockMatchQualitySorter

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			queryService = matchmakermock.NewMockQueryService(ctrl)
			playerValidator = mock.NewMockPlayerValidator(ctrl)
			botFactory = mock.NewMockBotFactory(ctrl)
			playerCombinator = mock.NewMockPlayerCombinator(ctrl)
			matchQualitySorter = mock.NewMockMatchQualitySorter(ctrl)
		}
	}

	p1 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
		playergen.WithInitTimestamp(time.Now()),
	)

	p2 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_DISCOVERY),
		playergen.WithInitTimestamp(time.Now()),
	)

	p3 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
		playergen.WithInitTimestamp(time.Now()),
	)

	p4 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
		playergen.WithInitTimestamp(time.Now()),
	)

	p5 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
		playergen.WithInitTimestamp(time.Now()),
	)

	b1 := player.NewBotPlayer(proto.GameMode_RANKED_CONSTRUCTED)

	b2 := player.NewBotPlayer(proto.GameMode_RANKED_CONSTRUCTED)

	gameModes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
	}

	request := &matchmaker.FindMatchesRequest{
		GameModes: gameModes,
	}

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	matcher := matchers.NewPVPMatchMatcher(
		zerolog.Nop(),
		queryService,
		playerValidator,
		botFactory,
		playerCombinator,
		matchQualitySorter,
	)

	t.Run("queries for players and finds the most optimal matches", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return([]*player.Player{p1, p2, p3, p4, p5}, nil)

		playerValidator.EXPECT().IsValid(p1).Return(true, nil)
		playerValidator.EXPECT().IsValid(p2).Return(true, nil)
		playerValidator.EXPECT().IsValid(p3).Return(true, nil)
		playerValidator.EXPECT().IsValid(p4).Return(true, nil)
		playerValidator.EXPECT().IsValid(p5).Return(true, nil)

		combinations := matchers.NewPlayerCombinationMap()
		combinations.Add(p1, p2)
		combinations.Add(p1, p3)
		combinations.Add(p3, p4)
		combinations.Add(p3, p5)

		playerCombinator.EXPECT().Combine([]*player.Player{p1, p2, p3, p4, p5}).Return(combinations, nil)

		matchQualitySorter.EXPECT().Sort(p1, []*player.Player{p2, p3})
		matchQualitySorter.EXPECT().Sort(p3, []*player.Player{p4, p5})

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.NoError(t, err)
		require.Len(t, matchProposals, 2)

		findPlayerInMatchProposals(t, p1, matchProposals)
		findPlayerInMatchProposals(t, p2, matchProposals)
		findPlayerInMatchProposals(t, p3, matchProposals)
		findPlayerInMatchProposals(t, p4, matchProposals)
	})

	t.Run("queries for players and finds the most optimal matches with bot", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return([]*player.Player{p1, p2, p3}, nil)

		playerValidator.EXPECT().IsValid(p1).Return(true, nil)
		playerValidator.EXPECT().IsValid(p2).Return(true, nil)
		playerValidator.EXPECT().IsValid(p3).Return(true, nil)

		botFactory.EXPECT().CreateSimple(gameModes[0]).Return(b1)

		combinations := matchers.NewPlayerCombinationMap()
		combinations.Add(p1, p2)
		combinations.Add(p1, p3)
		combinations.Add(p1, b1)
		combinations.Add(p2, b1)
		combinations.Add(p3, b1)

		playerCombinator.EXPECT().Combine([]*player.Player{p1, p2, p3, b1}).Return(combinations, nil)

		matchQualitySorter.EXPECT().Sort(p1, []*player.Player{p2, p3, b1})
		matchQualitySorter.EXPECT().Sort(p3, []*player.Player{b1})

		botFactory.EXPECT().CreateRegistered(p3).Return(b2, nil)

		request := &matchmaker.FindMatchesRequest{
			GameModes:  gameModes,
			EnableBots: true,
		}

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.NoError(t, err)
		require.Len(t, matchProposals, 2)

		findPlayerInMatchProposals(t, p1, matchProposals)
		findPlayerInMatchProposals(t, p2, matchProposals)
		findPlayerInMatchProposals(t, p3, matchProposals)
		findPlayerInMatchProposals(t, b2, matchProposals)
	})

	t.Run("does not use the bot when creating registered bot fails", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return([]*player.Player{p1, p2, p3}, nil)

		playerValidator.EXPECT().IsValid(p1).Return(true, nil)
		playerValidator.EXPECT().IsValid(p2).Return(true, nil)
		playerValidator.EXPECT().IsValid(p3).Return(true, nil)

		botFactory.EXPECT().CreateSimple(gameModes[0]).Return(b1)

		combinations := matchers.NewPlayerCombinationMap()
		combinations.Add(p1, p2)
		combinations.Add(p1, p3)
		combinations.Add(p1, b1)
		combinations.Add(p2, b1)
		combinations.Add(p3, b1)

		playerCombinator.EXPECT().Combine([]*player.Player{p1, p2, p3, b1}).Return(combinations, nil)

		matchQualitySorter.EXPECT().Sort(p1, []*player.Player{p2, p3, b1})
		matchQualitySorter.EXPECT().Sort(p3, []*player.Player{b1})

		botFactory.EXPECT().CreateRegistered(p3).Return(nil, someError)

		request := &matchmaker.FindMatchesRequest{
			GameModes:  gameModes,
			EnableBots: true,
		}

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.NoError(t, err)
		require.Len(t, matchProposals, 1)

		findPlayerInMatchProposals(t, p1, matchProposals)
		findPlayerInMatchProposals(t, p2, matchProposals)
	})

	t.Run("fails when combining players fails", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return([]*player.Player{p1, p2}, nil)

		playerValidator.EXPECT().IsValid(p1).Return(true, nil)
		playerValidator.EXPECT().IsValid(p2).Return(true, nil)

		playerCombinator.EXPECT().Combine([]*player.Player{p1, p2}).Return(nil, someError)

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.ErrorIs(t, err, someError)
		require.Empty(t, matchProposals)
	})

	t.Run("does nothing when there are less than 2 valid players", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return([]*player.Player{p1, p2}, nil)

		playerValidator.EXPECT().IsValid(p1).Return(true, nil)
		playerValidator.EXPECT().IsValid(p2).Return(false, nil)

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.NoError(t, err)
		require.Empty(t, matchProposals)
	})

	t.Run("does not fail when player validation fails", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return([]*player.Player{p1, p2, p3}, nil)

		playerValidator.EXPECT().IsValid(p1).Return(false, someError)
		playerValidator.EXPECT().IsValid(p2).Return(true, nil)
		playerValidator.EXPECT().IsValid(p3).Return(true, nil)

		combinations := matchers.NewPlayerCombinationMap()
		combinations.Add(p2, p3)

		playerCombinator.EXPECT().Combine([]*player.Player{p2, p3}).Return(combinations, nil)

		matchQualitySorter.EXPECT().Sort(p2, []*player.Player{p3})

		matcher := matchers.NewPVPMatchMatcher(
			matchmakertest.NewAssertErrorContainsLogger(t, "player validation"),
			queryService,
			playerValidator,
			botFactory,
			playerCombinator,
			matchQualitySorter,
		)

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.NoError(t, err)
		require.Len(t, matchProposals, 1)

		findPlayerInMatchProposals(t, p2, matchProposals)
		findPlayerInMatchProposals(t, p3, matchProposals)
	})

	t.Run("fails when querying players fails", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return(nil, someError)

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.ErrorIs(t, err, someError)
		require.Empty(t, matchProposals)
	})
}

func findPlayerInMatchProposals(t *testing.T, p *player.Player, matchProposals []*matchmaker.MatchProposal) {
	var found bool

	for _, proposal := range matchProposals {
		for _, pX := range proposal.Players {
			if p == pX {
				found = true
			}
		}
	}

	require.True(t, found)
}
