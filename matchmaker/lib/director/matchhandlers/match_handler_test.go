package matchhandlers_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/director/matchhandlers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/director/matchhandlers/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	matchmakermock "github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestMatchHandler(t *testing.T) {
	var matchmakerBackendService *matchmakermock.MockBackendService

	var matchProcessor *mock.MockMatchProcessor

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchmakerBackendService = matchmakermock.NewMockBackendService(ctrl)
			matchProcessor = mock.NewMockMatchProcessor(ctrl)
		}
	}

	p1 := playergen.MustNew()
	p2 := playergen.MustNew()
	p3 := playergen.MustNew()

	matchProposal1 := matchmaker.NewMatchProposal(p1, p2)

	matchProposal2 := matchmaker.NewMatchProposal(p3)

	findMatchParams1 := matchhandlers.FindMatchesParams{
		GameModes: []proto.GameMode{
			proto.GameMode_RANKED_CONSTRUCTED,
			proto.GameMode_RANKED_DISCOVERY,
		},
		MatchProposalStatus: matchmaker.MatchProposalStatusFound,
		EnableBots:          true,
	}

	findMatchParams2 := matchhandlers.FindMatchesParams{
		GameModes: []proto.GameMode{
			proto.GameMode_CONQUEST_CONSTRUCTED,
			proto.GameMode_RANKED_DISCOVERY,
		},
		MatchProposalStatus: matchmaker.MatchProposalStatusFound,
		EnableBots:          false,
	}

	ctx := context.Background()

	handler := matchhandlers.NewMatchHandler(
		zerolog.Nop(),
		matchmakerBackendService,
		matchProcessor,
		findMatchParams1,
		findMatchParams2,
	)

	t.Run("calls backend for match proposals and delegates match processor to process them", func(t *testing.T) {
		matchmakerBackendService.EXPECT().FindMatchProposals(ctx, &matchmaker.FindMatchesRequest{
			GameModes:           findMatchParams1.GameModes,
			MatchProposalStatus: findMatchParams1.MatchProposalStatus,
			EnableBots:          findMatchParams1.EnableBots,
		}).Return([]*matchmaker.MatchProposal{matchProposal1}, nil)
		matchmakerBackendService.EXPECT().FindMatchProposals(ctx, &matchmaker.FindMatchesRequest{
			GameModes:           findMatchParams2.GameModes,
			MatchProposalStatus: findMatchParams2.MatchProposalStatus,
			EnableBots:          findMatchParams2.EnableBots,
		}).Return([]*matchmaker.MatchProposal{matchProposal2}, nil)

		matchProcessor.EXPECT().ProcessMatch(ctx, matchProposal1)
		matchProcessor.EXPECT().ProcessMatch(ctx, matchProposal2)

		err := handler.HandleMatches(ctx)
		require.NoError(t, err)
	})

	t.Run("releases players when processing match fails", func(t *testing.T) {
		matchmakerBackendService.EXPECT().FindMatchProposals(ctx, &matchmaker.FindMatchesRequest{
			GameModes:           findMatchParams1.GameModes,
			MatchProposalStatus: findMatchParams1.MatchProposalStatus,
			EnableBots:          findMatchParams1.EnableBots,
		}).Return([]*matchmaker.MatchProposal{matchProposal1}, nil)
		matchmakerBackendService.EXPECT().FindMatchProposals(ctx, &matchmaker.FindMatchesRequest{
			GameModes:           findMatchParams2.GameModes,
			MatchProposalStatus: findMatchParams2.MatchProposalStatus,
			EnableBots:          findMatchParams2.EnableBots,
		}).Return([]*matchmaker.MatchProposal{matchProposal2}, nil)

		matchProcessor.EXPECT().ProcessMatch(ctx, matchProposal1).Return(fmt.Errorf("error"))
		matchProcessor.EXPECT().ProcessMatch(ctx, matchProposal2)

		matchmakerBackendService.EXPECT().ReleasePlayer(ctx, p1)
		matchmakerBackendService.EXPECT().ReleasePlayer(ctx, p2)

		err := handler.HandleMatches(ctx)
		require.NoError(t, err)
	})

	t.Run("does not fail when releasing player fails", func(t *testing.T) {
		matchmakerBackendService.EXPECT().FindMatchProposals(ctx, &matchmaker.FindMatchesRequest{
			GameModes:           findMatchParams1.GameModes,
			MatchProposalStatus: findMatchParams1.MatchProposalStatus,
			EnableBots:          findMatchParams1.EnableBots,
		}).Return([]*matchmaker.MatchProposal{matchProposal1}, nil)
		matchmakerBackendService.EXPECT().FindMatchProposals(ctx, &matchmaker.FindMatchesRequest{
			GameModes:           findMatchParams2.GameModes,
			MatchProposalStatus: findMatchParams2.MatchProposalStatus,
			EnableBots:          findMatchParams2.EnableBots,
		})

		matchProcessor.EXPECT().ProcessMatch(ctx, matchProposal1).Return(fmt.Errorf("error"))

		matchmakerBackendService.EXPECT().ReleasePlayer(ctx, p1).Return(fmt.Errorf("error"))
		matchmakerBackendService.EXPECT().ReleasePlayer(ctx, p2)

		err := handler.HandleMatches(ctx)
		require.NoError(t, err)
	})

	t.Run("does not fail when finding match proposals fails", func(t *testing.T) {
		matchmakerBackendService.EXPECT().FindMatchProposals(ctx, &matchmaker.FindMatchesRequest{
			GameModes:           findMatchParams1.GameModes,
			MatchProposalStatus: findMatchParams1.MatchProposalStatus,
			EnableBots:          findMatchParams1.EnableBots,
		}).Return([]*matchmaker.MatchProposal{matchProposal1}, nil)
		matchmakerBackendService.EXPECT().FindMatchProposals(ctx, &matchmaker.FindMatchesRequest{
			GameModes:           findMatchParams2.GameModes,
			MatchProposalStatus: findMatchParams2.MatchProposalStatus,
			EnableBots:          findMatchParams2.EnableBots,
		}).Return(nil, fmt.Errorf("error"))

		matchProcessor.EXPECT().ProcessMatch(ctx, matchProposal1)

		err := handler.HandleMatches(ctx)
		require.NoError(t, err)
	})
}
