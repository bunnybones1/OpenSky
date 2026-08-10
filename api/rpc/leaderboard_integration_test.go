//go:build integration

package rpc_test

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc"
)

func TestMatchesAndLeaderboard(t *testing.T) {
	apitest.TruncateAll()
	var err error

	_, err = data.DB.SQL().Exec("TRUNCATE accounts CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE decks CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE deck_ranks CASCADE")
	require.NoError(t, err)

	var accountID, accountID2, adminAccountID proto.AccountID

	var address, address2, inviterAddress, inviterAddress2 proto.Hash

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestMatchesAndLeaderboard-1")
			require.NoError(t, err)

			accountID2, address2, err = apitest.CreateRandomAccount("TestMatchesAndLeaderboard-2")
			require.NoError(t, err)

			_, inviterAddress, err = apitest.CreateRandomAccount("TestMatchesAndLeaderboard-inv-1")
			require.NoError(t, err)

			_, inviterAddress2, err = apitest.CreateRandomAccount("TestMatchesAndLeaderboard-inv-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestMatchesAndLeaderboard-admin")
			require.NoError(t, err)
		}
	}

	rankedConstructed := proto.GameMode_RANKED_CONSTRUCTED

	// Record invitations
	{
		var ok bool
		var err error

		ctx := apitest.AccountContext(accountID)

		// attempt to use the same accountID as inviter
		ok, err = apitest.Client().SetInvitedBy(ctx, &proto.SetInvitedByRequest{Address: address, InvitedBy: address})
		assert.False(t, ok)
		assert.Error(t, err)

		// attempt to use the same accountID (uppercased) as inviter
		ok, err = apitest.Client().SetInvitedBy(ctx, &proto.SetInvitedByRequest{Address: address, InvitedBy: proto.Hash(strings.ToUpper(address.String()))})
		assert.False(t, ok)
		assert.Error(t, err)

		// attempt to use the same accountID (lowercased) as inviter
		ok, err = apitest.Client().SetInvitedBy(ctx, &proto.SetInvitedByRequest{Address: address, InvitedBy: proto.Hash(strings.ToLower(address.String()))})
		assert.False(t, ok)
		assert.Error(t, err)

		// set inviter
		ok, err = apitest.Client().SetInvitedBy(ctx, &proto.SetInvitedByRequest{Address: address, InvitedBy: inviterAddress})
		assert.True(t, ok)
		assert.NoError(t, err)

		// set inviter again
		ok, err = apitest.Client().SetInvitedBy(ctx, &proto.SetInvitedByRequest{Address: address, InvitedBy: inviterAddress})
		assert.False(t, ok)
		assert.Error(t, err)
	}

	{
		var ok bool
		var err error

		ctx := apitest.AccountContext(accountID2)

		ok, err = apitest.Client().SetInvitedBy(ctx, &proto.SetInvitedByRequest{Address: address2, InvitedBy: inviterAddress2})
		assert.True(t, ok)
		assert.NoError(t, err)

		ok, err = apitest.Client().SetInvitedBy(ctx, &proto.SetInvitedByRequest{Address: address2, InvitedBy: inviterAddress2})
		assert.False(t, ok)
		assert.Error(t, err)
	}

	// Create deck strings
	var player1DeckString, player2DeckString string
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_AGY, data.SinglePrismDeckSize)
		player1DeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_AGY)
		require.NoError(t, err)
		assert.NotEmpty(t, player1DeckString)
	}
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		player2DeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		assert.NotEmpty(t, player2DeckString)
	}

	// Unlock heroes to get match XP
	{
		heroes := []proto.Hero{proto.Hero_ADA, proto.Hero_SAMYA, proto.Hero_FOX}

		for _, hero := range heroes {
			err := data.UnlockHero(data.DB, accountID, hero)
			require.NoError(t, err)

			err = data.UnlockHero(data.DB, accountID2, hero)
			require.NoError(t, err)
		}
	}

	// Create decks
	{
		var err error
		err = data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: player1DeckString,
			AccountID:  accountID,
			Class:      proto.DeckClass_AGY,
			Name:       "deck 1",
		}})
		require.NoError(t, err)

		err = data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: player2DeckString,
			AccountID:  accountID2,
			Class:      proto.DeckClass_STR,
			Name:       "deck 2",
		}})
		require.NoError(t, err)
	}

	// Attempt to start ranked match without enough XP
	{
		gameMode := proto.GameMode_RANKED_CONSTRUCTED
		_, _, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address,
				InitDeckString: player1DeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        address2,
				InitDeckString: player2DeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		assert.Error(t, err)
	}

	// Set minimum XP to play ranked
	{
		player1, err := data.DB.Accounts(nil).FindByID(accountID)
		assert.NoError(t, err)
		player1.Level = playerRank.MinimumLevelForRanked
		player1.Region = proto.NewRegion("Mx")

		err = data.DB.Save(player1)
		assert.NoError(t, err)
	}
	{
		player2, err := data.DB.Accounts(nil).FindByID(accountID2)
		assert.NoError(t, err)
		player2.Level = playerRank.MinimumLevelForRanked
		player2.Region = proto.NewRegion("CA")

		err = data.DB.Save(player2)
		assert.NoError(t, err)
	}

	// Record a match
	winningPlayerNum := uint(1) // player 1 keeps winning, in test scenario

	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)
		gameMode := proto.GameMode_RANKED_CONSTRUCTED
		s := "s"

		matchID, replayID, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:         address,
				InitDeckString:  player1DeckString,
				PlayerSessionId: &s,
			},
			Player2: &proto.MatchPlayer{
				Address:         address2,
				InitDeckString:  player2DeckString,
				PlayerSessionId: &s,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		assert.NoError(t, err)
		assert.NotZero(t, matchID)
		assert.NotZero(t, replayID)

		_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
			Status:            proto.MatchStatus_COMPLETED,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			Player1Moves:      30,
			Player2Moves:      30,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		assert.Error(t, err)

		_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
			MatchID:           matchID,
			Status:            proto.MatchStatus_COMPLETED,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			Player1Moves:      30,
			Player2Moves:      30,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
			EndedAt:           &endedAt,
		})
		assert.NoError(t, err)

		winner, err := data.DB.Accounts(nil).FindByID(accountID)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(winner.Level))

		xp, err := data.DB.Items().GetXP(winner.ID)
		assert.EqualValues(t, 50, int(xp))

		loser, err := data.DB.Accounts(nil).FindByID(accountID2)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(loser.Level))

		xp, err = data.DB.Items().GetXP(loser.ID)
		assert.EqualValues(t, 30, int(xp))

		// check skypass season progress
		skypassSeasonStatPlayer1, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, data.CurrentSeason())
		require.NoError(t, err)
		assert.Equal(t, playerRank.MinimumLevelForRanked+0, int(skypassSeasonStatPlayer1.InitialAccountLevel))
		assert.Equal(t, playerRank.MinimumLevelForRanked+0, int(skypassSeasonStatPlayer1.AchievedAccountLevel))
		skypassSeasonStatPlayer2, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID2, data.CurrentSeason())
		require.NoError(t, err)
		assert.Equal(t, playerRank.MinimumLevelForRanked+0, int(skypassSeasonStatPlayer2.InitialAccountLevel))
		assert.Equal(t, playerRank.MinimumLevelForRanked+0, int(skypassSeasonStatPlayer2.AchievedAccountLevel))
	}

	// List match
	{
		// service should have no access
		_, _, err := apitest.Client().ListMatches(apitest.ServiceContext(), nil, &proto.ListMatchesRequest{})
		assert.Error(t, err)

		// admin should have access
		_, res, err := apitest.Client().ListMatches(apitest.AccountContext(adminAccountID), nil, &proto.ListMatchesRequest{
			AccountAddress: &address,
		})
		assert.NoError(t, err)
		assert.True(t, len(res) > 0)

		assert.Equal(t, accountID, res[0].Player1.ID)
		assert.Equal(t, accountID2, res[0].Player2.ID)
		assert.Equal(t, address, res[0].Player1.Address)
		assert.Equal(t, address2, res[0].Player2.Address)
		assert.Equal(t, uint(1), *res[0].WinningPlayer)
		assert.NotEmpty(t, res[0].Player1.DeckString)
		assert.NotEmpty(t, res[0].Player2.DeckString)

		// user should see matches - their own
		_, res, err = apitest.Client().ListMatches(apitest.AccountContext(accountID), nil, nil)
		assert.NoError(t, err)
		assert.True(t, len(res) > 0)

		assert.Equal(t, accountID, res[0].Player1.ID)
		assert.Equal(t, accountID2, res[0].Player2.ID)
		assert.Equal(t, address, res[0].Player1.Address)
		assert.Equal(t, address2, res[0].Player2.Address)
		assert.Equal(t, uint(1), *res[0].WinningPlayer)
		assert.NotEmpty(t, res[0].Player1.DeckString)
		assert.NotEmpty(t, res[0].Player2.DeckString)
	}

	// List match with filter
	{
		_, res, err := apitest.Client().ListMatches(apitest.AccountContext(accountID), nil, &proto.ListMatchesRequest{
			AccountAddress: &address,
		})
		assert.NoError(t, err)
		require.NoError(t, err)

		assert.Equal(t, 1, len(res))

		assert.Equal(t, accountID, res[0].Player1.ID)
		assert.Equal(t, address, res[0].Player1.Address)
		assert.Equal(t, uint(1), *res[0].WinningPlayer)
	}

	// List match with filter
	{
		_, res, err := apitest.Client().ListMatches(apitest.AccountContext(accountID2), nil, &proto.ListMatchesRequest{
			AccountAddress: &address2,
		})
		require.NoError(t, err)

		assert.Equal(t, 1, len(res))

		assert.Equal(t, accountID2, res[0].Player2.ID)
		assert.Equal(t, address2, res[0].Player2.Address)
		assert.Equal(t, uint(1), *res[0].WinningPlayer)
	}

	// Fetch and check counter values
	{
		_, res, err := apitest.Client().ListLeaderboard(context.Background(), nil, &proto.ListLeaderboardRequest{GameMode: &rankedConstructed})
		require.NoError(t, err)
		require.Equal(t, int(2), len(res))

		entry, err := findLeaderboardEntryByAddress(res, accountID)
		require.NoError(t, err)
		assert.Equal(t, int32(1), entry.WinCount)
		assert.Equal(t, int32(0), entry.LossCount)
		assert.Equal(t, int32(0), entry.ForfeitCount)
		assert.Equal(t, int32(0), entry.AbandonCount)
		assert.Equal(t, int32(ranking.DefaultRP+43), *entry.Score)

		entry, err = findLeaderboardEntryByAddress(res, accountID2)
		require.NoError(t, err)
		assert.Equal(t, int32(0), entry.WinCount)
		assert.Equal(t, int32(1), entry.LossCount)
		assert.Equal(t, int32(0), entry.ForfeitCount)
		assert.Equal(t, int32(0), entry.AbandonCount)
		assert.Equal(t, int32(ranking.DefaultRP+0), *entry.Score)

		_, res, err = apitest.Client().ListLeaderboard(context.Background(), nil, &proto.ListLeaderboardRequest{
			Region:   proto.NewRegion("mx"),
			GameMode: &rankedConstructed,
		})
		require.NoError(t, err)
		require.Equal(t, int(1), len(res))

		_, res, err = apitest.Client().ListLeaderboard(context.Background(), nil, &proto.ListLeaderboardRequest{
			Region:   proto.NewRegion("ca"),
			GameMode: &rankedConstructed,
		})
		require.NoError(t, err)
		require.Equal(t, int(1), len(res))

		_, res, err = apitest.Client().ListLeaderboard(context.Background(), nil, &proto.ListLeaderboardRequest{
			Region:   proto.NewRegion("us"),
			GameMode: &rankedConstructed,
		})
		require.NoError(t, err)
		require.Equal(t, int(0), len(res))
	}

	// Check account leaderboard
	{
		accountAddress := address.String()
		p, res, err := apitest.Client().AccountLeaderboard(context.Background(), nil, &proto.AccountLeaderboardRequest{
			AccountAddress: &accountAddress,
			GameMode:       &rankedConstructed,
		})
		require.NoError(t, err)
		require.Equal(t, int(2), len(res))
		require.Equal(t, uint32(2), *p.PageSize)

		found := false
		for i := range res {
			if found {
				break
			}
			if res[i].Account.Address.String() == accountAddress {
				found = true
			}
		}

		require.True(t, found)
	}

	// Forfeit a match and test score
	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)
		gameMode := proto.GameMode_RANKED_CONSTRUCTED
		// s := "s"

		m, _, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address,
				DeckString:     player1DeckString,
				InitDeckString: player1DeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        address2,
				DeckString:     player2DeckString,
				InitDeckString: player2DeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		require.NoError(t, err)

		_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
			MatchID:           m,
			Status:            proto.MatchStatus_FORFEITED,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			Player1Moves:      30,
			Player2Moves:      30,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		assert.NoError(t, err)

		_, res, err := apitest.Client().ListLeaderboard(context.Background(), nil, &proto.ListLeaderboardRequest{GameMode: &rankedConstructed})
		assert.NoError(t, err)
		entry, err := findLeaderboardEntryByAddress(res, accountID2)
		require.NoError(t, err)
		assert.Equal(t, int32(1), entry.ForfeitCount)

		// validate metrics
		assert.Equal(t, int32(0), entry.WinCount)
		assert.Equal(t, int32(2), entry.LossCount)
		assert.Equal(t, int32(1), entry.ForfeitCount)
		assert.Equal(t, int32(0), entry.AbandonCount)

		// validate scores
		assert.Equal(t, int32(ranking.DefaultRP+0), *entry.Score) // player 2 RP can't fall below
		entry, err = findLeaderboardEntryByAddress(res, accountID)

		require.NoError(t, err)
		assert.Equal(t, int32(ranking.DefaultRP+85), *entry.Score) // player 1 RP goes up

		// validate metrics
		assert.Equal(t, int32(2), entry.WinCount)
		assert.Equal(t, int32(0), entry.LossCount)
		assert.Equal(t, int32(0), entry.ForfeitCount)
		assert.Equal(t, int32(0), entry.AbandonCount)

		winner, err := data.DB.Accounts(nil).FindByID(accountID)
		require.NoError(t, err)

		assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(winner.Level))
		xp, err := data.DB.Items().GetXP(winner.ID)
		assert.EqualValues(t, 100, int(xp))

		loser, err := data.DB.Accounts(nil).FindByID(accountID2)
		require.NoError(t, err)

		assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(loser.Level))
		xp, err = data.DB.Items().GetXP(loser.ID)
		assert.EqualValues(t, 60, int(xp))
	}

	// Abandon a match
	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)
		gameMode := proto.GameMode_RANKED_CONSTRUCTED

		m, _, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address,
				DeckString:     player1DeckString,
				InitDeckString: player1DeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        address2,
				DeckString:     player2DeckString,
				InitDeckString: player2DeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		require.NoError(t, err)

		_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
			MatchID:           m,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			Player1Moves:      30,
			Player2Moves:      30,
			Status:            proto.MatchStatus_ABANDONED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)
		_, res, err := apitest.Client().ListLeaderboard(context.Background(), nil, &proto.ListLeaderboardRequest{GameMode: &rankedConstructed})
		require.NoError(t, err)

		entry, err := findLeaderboardEntryByAddress(res, accountID2)
		require.NoError(t, err)
		assert.Equal(t, int32(1), entry.AbandonCount)

		// validate metrics
		assert.Equal(t, int32(0), entry.WinCount)
		assert.Equal(t, int32(3), entry.LossCount)
		assert.Equal(t, int32(1), entry.ForfeitCount)
		assert.Equal(t, int32(1), entry.AbandonCount)

		// test score
		assert.Equal(t, int32(ranking.DefaultRP+0), *entry.Score) // player 2 RP can't fall below

		entry, err = findLeaderboardEntryByAddress(res, accountID)
		require.NoError(t, err)
		assert.Equal(t, int32(ranking.DefaultRP+127), *entry.Score) // player 1 RP goes up

		// validate metrics
		assert.Equal(t, int32(3), entry.WinCount)
		assert.Equal(t, int32(0), entry.LossCount)
		assert.Equal(t, int32(0), entry.ForfeitCount)
		assert.Equal(t, int32(0), entry.AbandonCount)

		// Still level up guaranteed
		winner, err := data.DB.Accounts(nil).FindByID(accountID)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+1, int(winner.Level))
		xp, err := data.DB.Items().GetXP(winner.ID)
		assert.EqualValues(t, 50, int(xp))

		loser, err := data.DB.Accounts(nil).FindByID(accountID2)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(loser.Level))
		xp, err = data.DB.Items().GetXP(loser.ID)
		assert.EqualValues(t, 90, int(xp))
	}

	// Forfeit a match and test score for past level 3
	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)
		gameMode := proto.GameMode_RANKED_CONSTRUCTED

		m, _, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address,
				DeckString:     player1DeckString,
				InitDeckString: player1DeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        address2,
				DeckString:     player2DeckString,
				InitDeckString: player2DeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		require.NoError(t, err)

		_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
			MatchID:           m,
			Status:            proto.MatchStatus_FORFEITED,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			Player1Moves:      30,
			Player2Moves:      30,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         10,
		})
		assert.NoError(t, err)

		winner, err := data.DB.Accounts(nil).FindByID(accountID)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+1, int(winner.Level))
		xp, err := data.DB.Items().GetXP(winner.ID)
		assert.EqualValues(t, 100, int(xp))

		loser, err := data.DB.Accounts(nil).FindByID(accountID2)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(loser.Level))
		xp, err = data.DB.Items().GetXP(loser.ID)
		assert.EqualValues(t, 120, int(xp))
	}

	// Forfeit a match before turn 4 => no XP
	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)
		gameMode := proto.GameMode_RANKED_CONSTRUCTED

		m, _, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address,
				DeckString:     player1DeckString,
				InitDeckString: player1DeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        address2,
				DeckString:     player2DeckString,
				InitDeckString: player2DeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		require.NoError(t, err)

		_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
			MatchID:           m,
			Status:            proto.MatchStatus_FORFEITED,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			Player1Moves:      30,
			Player2Moves:      30,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         5,
		})
		assert.NoError(t, err)

		winner, err := data.DB.Accounts(nil).FindByID(accountID)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+2, int(winner.Level))
		xp, err := data.DB.Items().GetXP(winner.ID)
		assert.EqualValues(t, 50, int(xp))

		loser, err := data.DB.Accounts(nil).FindByID(accountID2)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(loser.Level))
		xp, err = data.DB.Items().GetXP(loser.ID)
		assert.EqualValues(t, 120, int(xp))
	}

	// Win 6th match to check if xp boosts reached 4
	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)
		gameMode := proto.GameMode_RANKED_CONSTRUCTED

		matchID, _, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address,
				InitDeckString: player1DeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        address2,
				InitDeckString: player2DeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		assert.NoError(t, err)
		assert.NotZero(t, matchID)

		_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
			MatchID:           matchID,
			Status:            proto.MatchStatus_COMPLETED,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			Player1Moves:      30,
			Player2Moves:      30,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
			EndedAt:           &endedAt,
		})
		assert.NoError(t, err)

		winner, err := data.DB.Accounts(nil).FindByID(accountID)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+2, int(winner.Level))
		xp, err := data.DB.Items().GetXP(winner.ID)
		assert.EqualValues(t, 100, int(xp))

		loser, err := data.DB.Accounts(nil).FindByID(accountID2)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(loser.Level))
		xp, err = data.DB.Items().GetXP(loser.ID)
		assert.EqualValues(t, 150, int(xp))
	}

	// Win 7th match to check if xp boosts are awarded properly
	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)
		gameMode := proto.GameMode_RANKED_CONSTRUCTED

		matchID, _, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address,
				InitDeckString: player1DeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        address2,
				InitDeckString: player2DeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		assert.NoError(t, err)
		assert.NotZero(t, matchID)

		_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
			MatchID:           matchID,
			Status:            proto.MatchStatus_COMPLETED,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			Player1Moves:      30,
			Player2Moves:      30,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
			EndedAt:           &endedAt,
		})
		assert.NoError(t, err)

		winner, err := data.DB.Accounts(nil).FindByID(accountID)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+2, int(winner.Level))
		xp, err := data.DB.Items().GetXP(winner.ID)
		assert.EqualValues(t, 150, int(xp))

		loser, err := data.DB.Accounts(nil).FindByID(accountID2)
		require.NoError(t, err)
		assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(loser.Level))
		xp, err = data.DB.Items().GetXP(loser.ID)
		assert.EqualValues(t, 180, int(xp))

		// check skypass season progress
		skypassSeasonStatPlayer1, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, data.CurrentSeason())
		require.NoError(t, err)
		assert.Equal(t, playerRank.MinimumLevelForRanked+2, int(skypassSeasonStatPlayer1.AchievedAccountLevel))
		skypassSeasonStatPlayer2, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID2, data.CurrentSeason())
		require.NoError(t, err)
		assert.Equal(t, playerRank.MinimumLevelForRanked+0, int(skypassSeasonStatPlayer2.AchievedAccountLevel))
	}
}

func TestAccountLeaderboard(t *testing.T) {
	gameMode := proto.GameMode_RANKED_CONSTRUCTED
	season := data.CurrentSeason()

	var accountIDs []proto.AccountID

	// Setup
	{
		// Accounts
		{
			for i := 1; i <= 5; i++ {
				accountID, _, err := apitest.CreateRandomAccount(fmt.Sprintf("TestAccountLeaderboard-%d", i))
				require.NoError(t, err)

				accountIDs = append(accountIDs, accountID)
			}
		}

		// Account stats
		{
			err := data.DB.AccountStats().Truncate()
			require.NoError(t, err)

			for i := 0; i < len(accountIDs); i++ {
				accountStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountIDs[i], gameMode, season)
				require.NoError(t, err)

				score := int32(len(accountIDs) - i)
				accountStats.Score = &score
				err = data.DB.Save(accountStats)
				require.NoError(t, err)
			}
		}
	}

	pageSize := uint32(4)
	page := &proto.Page{PageSize: &pageSize}

	tests := []struct {
		targetAccount     proto.AccountID
		expectedInEntries []proto.AccountID
	}{
		{
			targetAccount:     accountIDs[0],
			expectedInEntries: accountIDs[0:3],
		},
		{
			targetAccount:     accountIDs[1],
			expectedInEntries: accountIDs[0:4],
		},
		{
			targetAccount:     accountIDs[2],
			expectedInEntries: accountIDs[1:5],
		},
		{
			targetAccount:     accountIDs[3],
			expectedInEntries: accountIDs[2:5],
		},
		{
			targetAccount:     accountIDs[4],
			expectedInEntries: accountIDs[2:5],
		},
	}

	for _, tt := range tests {
		accountID := tt.targetAccount
		ctx := apitest.AccountContext(accountID)

		_, entries, err := apitest.Client().AccountLeaderboard(ctx, page, &proto.AccountLeaderboardRequest{
			GameMode: &gameMode,
		})
		require.NoError(t, err)
		require.NotEmpty(t, entries)

		require.Len(t, entries, len(tt.expectedInEntries))

		for i, expectedAccountID := range tt.expectedInEntries {
			assert.Equal(t, expectedAccountID, entries[i].Account.ID)
		}
	}
}

func findLeaderboardEntryByAddress(res []*proto.LeaderboardEntry, accountID proto.AccountID) (*proto.AccountStat, error) {
	for _, b := range res {
		if b.Account.ID == accountID {
			a, err := data.DB.AccountStats(nil).FindByAccountIDAndMode(accountID, proto.GameMode_RANKED_CONSTRUCTED, data.CurrentSeason())
			return a.AccountStat, err
		}
	}

	return nil, nil
}

func TestNextRewardsTime(t *testing.T) {
	t.Parallel()

	conf := config.OpenSkyLeaderboardRewardsConfig{
		Weekday: 3, // Wednesday
		Time: time.Date(
			2019,
			1,
			4,
			12,
			0,
			0,
			0,
			time.UTC,
		),
	}

	tt := time.Date(
		2019,
		1,
		7,
		0,
		0,
		0,
		0,
		time.UTC,
	)
	endTime := tt.Add(7 * 24 * time.Hour)

	rewards1 := time.Date(
		2019,
		1,
		9,
		12,
		0,
		0,
		0,
		time.UTC,
	)

	rewards2 := time.Date(
		2019,
		1,
		16,
		12,
		0,
		0,
		0,
		time.UTC,
	)

	for tt.Before(endTime) {
		resp := rpc.NextRewardsTime(tt, conf)

		if tt.Before(rewards1) {
			assert.Equal(t, rewards1, resp)
		} else {
			assert.Equal(t, rewards2, resp)
		}
		tt = tt.Add(time.Minute)
	}
}
