//go:build integration

package rpc_test

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/lib/levels"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestInternalMatchStart(t *testing.T) {
	var deck1, deck2 string
	var accountID1, accountID2, botAccountID1 proto.AccountID
	var address1, address2, botAddress1 proto.Hash

	var analyticsTracker *analyticsMock.MockTracker

	ctx := apitest.ServiceContext()

	// Setup
	{
		var err error

		// Accounts
		{
			accountID1, address1, err = apitest.CreateRandomAccount("TestInternalMatchStart-account-1")
			require.NoError(t, err)

			accountID2, address2, err = apitest.CreateRandomAccount("TestInternalMatchStart-account-2")
			require.NoError(t, err)

			botAccountID1, botAddress1, err = apitest.CreateRandomAccount("TestInternalMatchStart-bot-account-1")
			require.NoError(t, err)

			botAccount, err := data.DB.Accounts().FindByID(botAccountID1)
			require.NoError(t, err)
			botAccount.IsBot = true
			err = data.DB.Save(botAccount)
			require.NoError(t, err)
		}

		// Create deck strings
		{
			var agyDeckString, strDeckString string
			{
				var err error
				cardIDs := getDeckForClass(proto.CardClass_AGY, data.SinglePrismDeckSize)
				agyDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_AGY)
				require.NoError(t, err)
				assert.NotEmpty(t, agyDeckString)
			}

			{
				var err error
				cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
				strDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
				require.NoError(t, err)
				assert.NotEmpty(t, strDeckString)
			}

			{
				err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
					DeckString: agyDeckString,
					AccountID:  accountID1,
					Class:      proto.DeckClass_AGY,
					Name:       "deck 1",
				}})
				require.NoError(t, err)
			}

			{
				err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
					DeckString: strDeckString,
					AccountID:  accountID2,
					Class:      proto.DeckClass_STR,
					Name:       "deck 2",
				}})
				require.NoError(t, err)
			}

			deck1, deck2 = agyDeckString, strDeckString
		}
	}

	t.Run("track PVP/PVP stats", func(t *testing.T) {
		// Mocks
		{
			ctrl := gomock.NewController(t)

			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
			analyticsTracker.EXPECT().TrackStartMatch(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(r *http.Request, match *proto.Match, req *proto.MatchStartRequest) error {
				assert.Equal(t, proto.GameMode_PRACTICE_PVP, *req.Info.Player1GameMode)
				assert.Equal(t, proto.GameMode_PRACTICE_PVP, *req.Info.Player2GameMode)
				return nil
			})

			analyticsTracker.EXPECT().TrackEndMatch(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(r *http.Request, match *data.Match, req *proto.MatchEndRequest) error {
				assert.False(t, match.IsPracticeBot())
				return nil
			})

			apiService := apitest.APIService()

			originalTracker := apiService.RPC.Analytics

			apiService.RPC.Analytics = analyticsTracker

			t.Cleanup(func() {
				apiService.RPC.Analytics = originalTracker
			})
		}

		gameMode := proto.GameMode_PRACTICE_PVP

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address1,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        address2,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})

		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		winningPlayer := uint(1)

		endedAt := time.Now().Add(10 * time.Minute).UTC()
		_, err = apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Status:            proto.MatchStatus_COMPLETED,
			Player1DeckString: "SWxHRT01",
			Player2DeckString: "SWxSTR01",
			WinningPlayer:     &winningPlayer,
			EndedAt:           &endedAt,
		})
		assert.NoError(t, err)
	})

	t.Run("track bot match stats", func(t *testing.T) {
		// Mocks
		{
			ctrl := gomock.NewController(t)

			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
			analyticsTracker.EXPECT().TrackStartMatch(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(r *http.Request, match *proto.Match, req *proto.MatchStartRequest) error {
				assert.Equal(t, proto.GameMode_PRACTICE_BOT, *req.Info.Player1GameMode)
				assert.Equal(t, proto.GameMode_PRACTICE_BOT, *req.Info.Player2GameMode)
				assert.False(t, req.Player1.IsBot)
				assert.True(t, req.Player2.IsBot)
				return nil
			})

			analyticsTracker.EXPECT().TrackEndMatch(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(r *http.Request, match *data.Match, req *proto.MatchEndRequest) error {
				assert.True(t, match.IsPracticeBot())
				return nil
			})

			apiService := apitest.APIService()

			originalTracker := apiService.RPC.Analytics

			apiService.RPC.Analytics = analyticsTracker

			t.Cleanup(func() {
				apiService.RPC.Analytics = originalTracker
			})
		}

		gameMode := proto.GameMode_PRACTICE_BOT

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address1,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        botAddress1,
				InitDeckString: deck2,
				IsBot:          true,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})

		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID, "this is an actual account")

		winningPlayer := uint(1)

		ctxAccount1 := apitest.AccountContext(accountID1)

		_, err = apitest.Client().BotMatchEnd(ctxAccount1, &proto.BotMatchEndRequest{
			Status:         proto.MatchStatus_COMPLETED,
			DeckString:     "SWxHRT01",
			WinningPlayer:  &winningPlayer,
			TurnNonce:      15,
			MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
		})
		assert.NoError(t, err)
	})

	t.Run("track PVP/RANKED stats", func(t *testing.T) {
		// Mocks
		{
			ctrl := gomock.NewController(t)

			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
			analyticsTracker.EXPECT().TrackStartMatch(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(r *http.Request, match *proto.Match, req *proto.MatchStartRequest) error {
				assert.Equal(t, proto.GameMode_PRACTICE_PVP, *req.Info.Player1GameMode)
				assert.Equal(t, proto.GameMode_RANKED_CONSTRUCTED, *req.Info.Player2GameMode)
				return nil
			})

			analyticsTracker.EXPECT().TrackRewardMatch(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any())
			analyticsTracker.EXPECT().TrackEndMatch(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(r *http.Request, match *data.Match, req *proto.MatchEndRequest) error {
				assert.False(t, match.IsPracticeBot())
				return nil
			})

			apiService := apitest.APIService()

			originalTracker := apiService.RPC.Analytics

			apiService.RPC.Analytics = analyticsTracker

			t.Cleanup(func() {
				apiService.RPC.Analytics = originalTracker
			})
		}

		account3 := &proto.Account{
			Address: apitest.RandomAddress(),
			Name:    fmt.Sprintf("druid-1111"),
			Level:   playerRank.MinimumLevelForRanked,
		}
		err := data.DB.Save(&data.Account{account3})
		require.NoError(t, err)

		p1GameMode := proto.GameMode_PRACTICE_PVP
		p2GameMode := proto.GameMode_RANKED_CONSTRUCTED

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        address1,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        account3.Address,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &p1GameMode,
				Player2GameMode: &p2GameMode,
			},
		})

		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		winningPlayer := uint(1)

		endedAt := time.Now().Add(10 * time.Minute).UTC()
		_, err = apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Status:            proto.MatchStatus_COMPLETED,
			Player1DeckString: "SWxHRT01",
			Player2DeckString: "SWxSTR01",
			WinningPlayer:     &winningPlayer,
			EndedAt:           &endedAt,
		})
		assert.NoError(t, err)

		// count games played
		gamesPlayed, err := data.DB.AccountStats().GetGamesPlayed(account3.ID, data.CurrentSeason())
		assert.NoError(t, err)

		assert.Equal(t, uint32(1), gamesPlayed)
	})

	t.Run("fails when the game mode is disabled", func(t *testing.T) {
		mode := proto.GameMode_RANKED_CONSTRUCTED

		// Setup
		{
			// Game mode status
			{
				status := data.GameModeStatus{
					GameModeStatus: &proto.GameModeStatus{
						GameMode: &mode,
						Enabled:  false,
					},
				}

				err := data.DB.Save(&status)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.GameModeStatus(nil).Truncate()
					require.NoError(t, err)
				})
			}
		}

		matchStartRequest := &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{},
			Player2: &proto.MatchPlayer{},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &mode,
				Player2GameMode: &mode,
			},
		}

		ctx := apitest.ServiceContext()

		matchID, _, err := apitest.Client().InternalMatchStart(ctx, matchStartRequest)
		require.ErrorContains(t, err, "\"RANKED_CONSTRUCTED\"")
		assert.Zero(t, matchID)
	})
}

func TestBotMatch(t *testing.T) {
	// Run fixtures to give us some user data
	f, err := apitest.GenFixtures()
	assert.NoError(t, err)

	// Unlock heroes to get match XP
	{
		heroes := []proto.Hero{proto.Hero_ADA, proto.Hero_SAMYA, proto.Hero_FOX}

		for _, hero := range heroes {
			err := data.UnlockHero(data.DB, f.UserNoExpA.ID, hero)
			require.NoError(t, err)

			err = data.UnlockHero(data.DB, f.UserNoExpB.ID, hero)
			require.NoError(t, err)
		}
	}

	ctxUserA := apitest.AccountContext(f.UserNoExpA.ID)
	ctxUserB := apitest.AccountContext(f.UserNoExpB.ID)

	// win a match
	winner := uint(1)
	rewards, err := apitest.Client().BotMatchEnd(ctxUserA, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_COMPLETED,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.True(t, len(rewards) > 0)

	// lose a match
	winner = uint(2)
	rewards, err = apitest.Client().BotMatchEnd(ctxUserA, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_COMPLETED,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.True(t, len(rewards) > 0)

	// forfeit a match
	winner = uint(2)
	rewards, err = apitest.Client().BotMatchEnd(ctxUserA, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_FORFEITED,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.True(t, len(rewards) > 0)

	// check value of warm ups with a different user
	humanPlayer, err := data.DB.Accounts(nil).FindByID(f.UserNoExpB.ID)
	assert.NoError(t, err)
	assert.Equal(t, uint8(0), humanPlayer.WarmUps)

	// win a warm-up match
	winner = uint(1)
	gameMode := proto.GameMode_WARM_UP

	rewards, err = apitest.Client().BotMatchEnd(ctxUserB, &proto.BotMatchEndRequest{
		Mode:           &gameMode,
		Status:         proto.MatchStatus_COMPLETED,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.True(t, len(rewards) > 0)

	// check value of warm ups
	humanPlayer, err = data.DB.Accounts(nil).FindByID(f.UserNoExpB.ID)
	assert.NoError(t, err)
	assert.Equal(t, uint8(1), humanPlayer.WarmUps)

	// win a practise match
	winner = uint(1)
	rewards, err = apitest.Client().BotMatchEnd(ctxUserB, &proto.BotMatchEndRequest{
		Mode:           &gameMode,
		Status:         proto.MatchStatus_COMPLETED,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.True(t, len(rewards) > 0)

	// check value of warm ups
	humanPlayer, err = data.DB.Accounts(nil).FindByID(f.UserNoExpB.ID)
	assert.NoError(t, err)
	assert.Equal(t, uint8(2), humanPlayer.WarmUps)

	// lose a match
	winner = uint(2)
	rewards, err = apitest.Client().BotMatchEnd(ctxUserB, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_COMPLETED,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.True(t, len(rewards) > 0)

	// check value of warm ups
	humanPlayer, err = data.DB.Accounts(nil).FindByID(f.UserNoExpB.ID)
	assert.NoError(t, err)
	assert.Equal(t, uint8(2), humanPlayer.WarmUps)

	// forfeit a match
	winner = uint(2)
	rewards, err = apitest.Client().BotMatchEnd(ctxUserB, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_FORFEITED,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.True(t, len(rewards) > 0)

	// check value of warm ups
	humanPlayer, err = data.DB.Accounts(nil).FindByID(f.UserNoExpB.ID)
	assert.NoError(t, err)
	assert.Equal(t, uint8(2), humanPlayer.WarmUps)

	// continue winning matches and expect warm_ups to be less than or equal to 3
	for i := 0; i < 5; i++ {
		// win a match
		winner := uint(1)
		_, err := apitest.Client().BotMatchEnd(ctxUserB, &proto.BotMatchEndRequest{
			Status:         proto.MatchStatus_COMPLETED,
			WinningPlayer:  &winner,
			DeckString:     "SWxHRT01",
			TurnNonce:      15,
			MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
		})
		require.NoError(t, err)

		// check value of warm ups
		humanPlayer, err = data.DB.Accounts(nil).FindByID(f.UserNoExpB.ID)
		assert.NoError(t, err)
		assert.LessOrEqual(t, humanPlayer.WarmUps, uint8(3))
	}
}

func TestGetBotAccounts(t *testing.T) {
	ctx := apitest.ServiceContext()

	opponentRank := proto.PlayerRank_APPRENTICE
	gameMode := proto.GameMode_RANKED_CONSTRUCTED
	season := data.CurrentSeason()

	{
		var err error

		accounts := make([]data.Account, 6)

		for i := 0; i < len(accounts); i++ {
			accounts[i] = data.Account{
				&proto.Account{
					Name:    fmt.Sprintf("account-%d", i),
					Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", i)),
					IsBot:   true,
				},
			}

			err = data.DB.Save(&accounts[i])
			require.NoError(t, err)

			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accounts[i].ID, gameMode, season)
			require.NoError(t, err)

			stats.PlayerRank = proto.PlayerRank(i%6 + 1)

			score := int32(100 * (i + 1))
			stats.Score = &score

			err = data.DB.Save(stats)
			require.NoError(t, err)
		}

	}

	{
		targetScore := int32(240)

		users, err := apitest.Client().InternalGetBotAccounts(ctx, &proto.InternalGetBotAccountsRequest{
			OpponentRank:  &opponentRank,
			OpponentScore: targetScore,
			GameMode:      &gameMode,
		})
		assert.NoError(t, err)
		assert.NotZero(t, len(users))

		lastDiff := int32(-1)

		for i := range users {
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(
				users[i].ID,
				gameMode,
				season,
			)
			require.NoError(t, err)
			require.LessOrEqual(t, stats.PlayerRank, opponentRank)

			diff := int32(math.Abs(float64(targetScore) - float64(*stats.Score)))

			if lastDiff >= 0 {
				require.LessOrEqual(t, lastDiff, diff)
			}
			lastDiff = diff
		}
	}
}

func TestConquestMatch(t *testing.T) {
	ctrl := gomock.NewController(t)

	conquestAccountStatUpdater := mock.NewMockConquestAccountStatUpdater(ctrl)
	conquestV2PointsUpdater := mock.NewMockConquestV2PointsUpdater(ctrl)
	conquestStateManager := mock.NewMockConquestStateManager(ctrl)

	apiService := apitest.APIService()

	originalConquestAccountStatUpdater := apiService.RPC.ConquestAccountStatUpdater
	originalConquestV2PointsUpdater := apiService.RPC.ConquestV2PointsUpdater
	originalConquestStateManager := apiService.RPC.ConquestStateManager

	apiService.RPC.ConquestAccountStatUpdater = conquestAccountStatUpdater
	apiService.RPC.ConquestV2PointsUpdater = conquestV2PointsUpdater
	apiService.RPC.ConquestStateManager = conquestStateManager

	t.Cleanup(func() {
		apiService.RPC.ConquestAccountStatUpdater = originalConquestAccountStatUpdater
		apiService.RPC.ConquestV2PointsUpdater = originalConquestV2PointsUpdater
		apiService.RPC.ConquestStateManager = originalConquestStateManager
	})

	// Create new accounts
	var accountID, accountID2 proto.AccountID

	var address, address2 proto.Hash
	{
		var err error
		accountID, address, err = apitest.CreateRandomAccount("TestConquestMatch-1")
		require.NoError(t, err)
		accountID2, address2, err = apitest.CreateRandomAccount("TestConquestMatch-2")
		require.NoError(t, err)
	}

	// Create deck strings
	var player1DeckString, player2DeckString string
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		player1DeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		require.NotEmpty(t, player1DeckString)

		cardIDs = getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		player2DeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		require.NotEmpty(t, player2DeckString)
	}

	// Create decks
	{
		var err error
		err = data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: player1DeckString,
			AccountID:  accountID,
			Class:      proto.DeckClass_STR,
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

	season := data.CurrentSeason()

	startedAt := time.Now()
	endedAt := startedAt.Add(time.Second * 500)
	deckClass := proto.DeckClass_STR
	gameMode := proto.GameMode_CONQUEST_CONSTRUCTED

	matchStartRequest := &proto.MatchStartRequest{
		Player1: &proto.MatchPlayer{
			Address:        address,
			InitDeckString: player1DeckString,
			DeckClass:      &deckClass,
		},
		Player2: &proto.MatchPlayer{
			Address:        address2,
			InitDeckString: player2DeckString,
			DeckClass:      &deckClass,
		},
		Info: &proto.MatchStartInfo{
			Player1GameMode: &gameMode,
			Player2GameMode: &gameMode,
		},
	}

	getMatchEndRequestFunc := func(matchID uint64, winningPlayer uint) *proto.MatchEndRequest {
		return &proto.MatchEndRequest{
			MatchID:           matchID,
			Status:            proto.MatchStatus_COMPLETED,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			Player1Moves:      30,
			Player2Moves:      30,
			WinningPlayer:     &winningPlayer,
			TurnNonce:         20,
			EndedAt:           &endedAt,
		}
	}

	ctx := apitest.ServiceContext()

	t.Run("conquests get updated progress when player one wins", func(t *testing.T) {
		// Setup
		createConquest(t, accountID, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestStatus_IN_PROGRESS, 1, nil)
		createConquest(t, accountID2, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestStatus_IN_PROGRESS, 1, nil)

		t.Cleanup(func() {
			err := data.DB.Conquests().Find(db.Cond{"account_id": db.In(accountID, accountID2)}).Delete()
			require.NoError(t, err)
		})

		conquestV2PointsReward := &proto.Reward{
			Type: proto.RewardType_CONQUEST_POINTS,
		}

		matchID, _, err := apitest.Client().InternalMatchStart(ctx, matchStartRequest)
		require.NoError(t, err)
		require.NotZero(t, matchID)

		conquestAccountStatUpdater.EXPECT().RecalculateScore(gomock.Any(), gomock.Any(), proto.GameMode_CONQUEST_CONSTRUCTED, season, gomock.Any()).DoAndReturn(func(ctx context.Context, sess db.Session, mode proto.GameMode, season uint16, account *data.Account) error {
			assert.Equal(t, accountID, account.ID)

			return nil
		})
		conquestAccountStatUpdater.EXPECT().RecalculateScore(gomock.Any(), gomock.Any(), proto.GameMode_CONQUEST_CONSTRUCTED, season, gomock.Any()).DoAndReturn(func(ctx context.Context, sess db.Session, mode proto.GameMode, season uint16, account *data.Account) error {
			assert.Equal(t, accountID2, account.ID)

			return nil
		})
		conquestV2PointsUpdater.EXPECT().Update(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, _ db.Session, match *data.Match) ([]*proto.FeedEvent, []*proto.Reward, error) {
			assert.Equal(t, matchID, match.ID)

			return nil, []*proto.Reward{conquestV2PointsReward}, nil
		})

		conquestStateManager.EXPECT().UpdateProgress(gomock.Any(), gomock.Any(), accountID, matchID, proto.ConquestMatchResult_WIN)
		conquestStateManager.EXPECT().UpdateProgress(gomock.Any(), gomock.Any(), accountID2, matchID, proto.ConquestMatchResult_LOSS)

		rewards, err := apitest.Client().InternalMatchEnd(ctx, getMatchEndRequestFunc(matchID, uint(1)))
		require.NoError(t, err)

		require.GreaterOrEqual(t, len(rewards), 1)
		assert.Contains(t, rewards, conquestV2PointsReward)
	})

	t.Run("conquests get updated progress when there is a draw", func(t *testing.T) {
		// Setup
		createConquest(t, accountID, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestStatus_IN_PROGRESS, 1, nil)
		createConquest(t, accountID2, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestStatus_IN_PROGRESS, 1, nil)

		t.Cleanup(func() {
			err := data.DB.Conquests().Find(db.Cond{"account_id": db.In(accountID, accountID2)}).Delete()
			require.NoError(t, err)
		})

		matchID, _, err := apitest.Client().InternalMatchStart(ctx, matchStartRequest)
		require.NoError(t, err)
		require.NotZero(t, matchID)

		conquestAccountStatUpdater.EXPECT().RecalculateScore(gomock.Any(), gomock.Any(), proto.GameMode_CONQUEST_CONSTRUCTED, season, gomock.Any()).DoAndReturn(func(ctx context.Context, sess db.Session, mode proto.GameMode, season uint16, account *data.Account) error {
			assert.Equal(t, accountID, account.ID)

			return nil
		})
		conquestAccountStatUpdater.EXPECT().RecalculateScore(gomock.Any(), gomock.Any(), proto.GameMode_CONQUEST_CONSTRUCTED, season, gomock.Any()).DoAndReturn(func(ctx context.Context, sess db.Session, mode proto.GameMode, season uint16, account *data.Account) error {
			assert.Equal(t, accountID2, account.ID)

			return nil
		})

		conquestV2PointsUpdater.EXPECT().Update(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, _ db.Session, match *data.Match) ([]*proto.FeedEvent, []*proto.Reward, error) {
			assert.Equal(t, matchID, match.ID)

			return nil, nil, nil
		})

		conquestStateManager.EXPECT().UpdateProgress(gomock.Any(), gomock.Any(), accountID, matchID, proto.ConquestMatchResult_DRAW)
		conquestStateManager.EXPECT().UpdateProgress(gomock.Any(), gomock.Any(), accountID2, matchID, proto.ConquestMatchResult_DRAW)

		_, err = apitest.Client().InternalMatchEnd(ctx, getMatchEndRequestFunc(matchID, uint(0)))
		require.NoError(t, err)
	})

	t.Run("conquests get updated progress when player two wins", func(t *testing.T) {
		// Setup
		createConquest(t, accountID, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestStatus_IN_PROGRESS, 1, proto.ConquestMatchResultMap{
			11: proto.ConquestMatchResult_WIN,
			12: proto.ConquestMatchResult_WIN,
		})
		createConquest(t, accountID2, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestStatus_IN_PROGRESS, 1, nil)

		t.Cleanup(func() {
			err := data.DB.Conquests().Find(db.Cond{"account_id": db.In(accountID, accountID2)}).Delete()
			require.NoError(t, err)
		})

		matchID, _, err := apitest.Client().InternalMatchStart(ctx, matchStartRequest)
		require.NoError(t, err)
		require.NotZero(t, matchID)

		conquestAccountStatUpdater.EXPECT().RecalculateScore(gomock.Any(), gomock.Any(), proto.GameMode_CONQUEST_CONSTRUCTED, season, gomock.Any()).DoAndReturn(func(ctx context.Context, sess db.Session, mode proto.GameMode, season uint16, account *data.Account) error {
			assert.Equal(t, accountID2, account.ID)

			return nil
		})
		conquestAccountStatUpdater.EXPECT().RecalculateScore(gomock.Any(), gomock.Any(), proto.GameMode_CONQUEST_CONSTRUCTED, season, gomock.Any()).DoAndReturn(func(ctx context.Context, sess db.Session, mode proto.GameMode, season uint16, account *data.Account) error {
			assert.Equal(t, accountID, account.ID)

			return nil
		})
		conquestV2PointsUpdater.EXPECT().Update(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, _ db.Session, match *data.Match) ([]*proto.FeedEvent, []*proto.Reward, error) {
			assert.Equal(t, matchID, match.ID)

			return nil, nil, nil
		})

		conquestStateManager.EXPECT().UpdateProgress(gomock.Any(), gomock.Any(), accountID, matchID, proto.ConquestMatchResult_LOSS)
		conquestStateManager.EXPECT().UpdateProgress(gomock.Any(), gomock.Any(), accountID2, matchID, proto.ConquestMatchResult_WIN)

		_, err = apitest.Client().InternalMatchEnd(ctx, getMatchEndRequestFunc(matchID, uint(2)))
		require.NoError(t, err)
	})
}

func TestMatchCrashedStatus(t *testing.T) {
	// Run fixtures to give us some user data
	f, err := apitest.GenFixtures()
	assert.NoError(t, err)

	// Unlock heroes to get match XP
	{
		heroes := []proto.Hero{proto.Hero_ADA, proto.Hero_SAMYA, proto.Hero_FOX}

		for _, hero := range heroes {
			err := data.UnlockHero(data.DB, f.UserA.ID, hero)
			require.NoError(t, err)

			err = data.UnlockHero(data.DB, f.UserB.ID, hero)
			require.NoError(t, err)
		}
	}

	// Auth token to communicate to the api as a service<>service
	ctx := apitest.ServiceContext()
	gameMode := proto.GameMode_RANKED_DISCOVERY

	// Start a new match
	matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
		Player1: &proto.MatchPlayer{
			Address:        f.UserA.Address,
			InitDeckString: "SWxHRT01",
		},
		Player2: &proto.MatchPlayer{
			Address:        f.UserB.Address,
			InitDeckString: "SWxSTR01",
		},
		Info: &proto.MatchStartInfo{
			Player1GameMode: &gameMode,
			Player2GameMode: &gameMode,
		},
	})
	assert.NoError(t, err)
	assert.NotZero(t, matchID)
	assert.NotZero(t, replayID)

	// Fetch the match from the service
	match, err := apitest.Client().GetMatch(ctx, matchID)
	assert.NoError(t, err)
	assert.NotNil(t, match)

	// Save crashed match
	endedAt := time.Now().Add(10 * time.Minute).UTC()
	_, err = apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
		MatchID:           match.ID,
		Status:            proto.MatchStatus_CRASHED,
		Player1DeckString: "SWxHRT01",
		Player2DeckString: "SWxSTR01",
		EndedAt:           &endedAt,
	})
	assert.NoError(t, err)

	winner, err := data.DB.Accounts(nil).FindByID(f.UserA.ID)
	require.NoError(t, err)
	assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(winner.Level))
	xp, err := data.DB.Items().GetXP(winner.ID)
	assert.EqualValues(t, 50, int(xp))

	loser, err := data.DB.Accounts(nil).FindByID(f.UserA.ID)
	require.NoError(t, err)
	assert.EqualValues(t, playerRank.MinimumLevelForRanked+0, int(loser.Level))
	xp, err = data.DB.Items().GetXP(loser.ID)
	assert.EqualValues(t, 50, int(xp))
}

func TestTutorialMatchXPReward(t *testing.T) {
	findTutorialRewards := func(tutorialRewards []*proto.Reward) (found bool, awardedXP uint64) {
		for _, reward := range tutorialRewards {
			if reward.Type == proto.RewardType_EXP {
				if reward.Exp.Reason == proto.RewardExpReason_TutorialCompleted {
					found = true
					awardedXP += reward.Exp.Amount
				}
			}
		}
		return found, awardedXP
	}

	var analyticsTracker *analyticsMock.MockTracker
	{
		ctrl := gomock.NewController(t)

		analyticsTracker = analyticsMock.NewMockTracker(ctrl)

		apiService := apitest.APIService()

		originalTracker := apiService.RPC.Analytics
		t.Cleanup(func() {
			apiService.RPC.Analytics = originalTracker
		})

		apiService.RPC.Analytics = analyticsTracker
	}

	// Run fixtures to give us some user data
	f, err := apitest.GenFixtures()
	assert.NoError(t, err)

	ctxUserA := apitest.AccountContext(f.UserNoExpA.ID)
	ctxUserB := apitest.AccountContext(f.UserNoExpB.ID)

	// set initial tutorial progress
	err = data.DB.TutorialProgress().RecordProgress(f.UserNoExpA.ID, proto.TutorialLevel_LEVEL_1)
	require.NoError(t, err)

	err = data.DB.TutorialProgress().RecordProgress(f.UserNoExpA.ID, proto.TutorialLevel_LEVEL_2)
	require.NoError(t, err)

	analyticsTracker.EXPECT().TrackEndMatch(gomock.Any(), gomock.Any(), gomock.Any())
	analyticsTracker.EXPECT().TrackTutorialStatus(gomock.Any(), gomock.Any(), gomock.Any())

	// win a tutorial 2 match
	winner := uint(1)
	tutorialLevel := proto.TutorialLevel_LEVEL_2
	tutorialMode := proto.GameMode_TUTORIAL
	tutorialRewards, err := apitest.Client().BotMatchEnd(ctxUserA, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_COMPLETED,
		TutorialLevel:  &tutorialLevel,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		Mode:           &tutorialMode,
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.Empty(t, tutorialRewards)

	analyticsTracker.EXPECT().TrackEndMatch(gomock.Any(), gomock.Any(), gomock.Any())
	analyticsTracker.EXPECT().TrackTutorialStatus(gomock.Any(), gomock.Any(), gomock.Any())

	// win a tutorial 3 match
	winner = uint(1)
	tutorialLevel = proto.TutorialLevel_LEVEL_3
	tutorialMode = proto.GameMode_TUTORIAL
	tutorialRewards, err = apitest.Client().BotMatchEnd(ctxUserA, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_COMPLETED,
		TutorialLevel:  &tutorialLevel,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		Mode:           &tutorialMode,
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.NotEmpty(t, tutorialRewards)

	{
		found, awardedXP := findTutorialRewards(tutorialRewards)

		assert.True(t, found)
		assert.Equal(t, 0, int(awardedXP))
	}

	analyticsTracker.EXPECT().TrackEndMatch(gomock.Any(), gomock.Any(), gomock.Any())
	analyticsTracker.EXPECT().TrackTutorialStatus(gomock.Any(), gomock.Any(), gomock.Any())

	// win a tutorial 3 match (again)
	winner = uint(1)
	tutorialLevel = proto.TutorialLevel_LEVEL_3
	tutorialMode = proto.GameMode_TUTORIAL
	tutorialRewards, err = apitest.Client().BotMatchEnd(ctxUserA, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_COMPLETED,
		TutorialLevel:  &tutorialLevel,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		Mode:           &tutorialMode,
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.Empty(t, tutorialRewards)

	analyticsTracker.EXPECT().TrackEndMatch(gomock.Any(), gomock.Any(), gomock.Any())
	analyticsTracker.EXPECT().TrackTutorialStatus(gomock.Any(), gomock.Any(), gomock.Any())

	// win a tutorial 2 match as a new user (no user store object)
	winner = uint(1)
	tutorialLevel = proto.TutorialLevel_LEVEL_2
	tutorialMode = proto.GameMode_TUTORIAL
	tutorialRewards, err = apitest.Client().BotMatchEnd(ctxUserB, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_COMPLETED,
		TutorialLevel:  &tutorialLevel,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		Mode:           &tutorialMode,
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.NotEmpty(t, tutorialRewards)

	{
		found, awardedXP := findTutorialRewards(tutorialRewards)

		assert.True(t, found)
		assert.Equal(t, 0, int(awardedXP))
	}

	analyticsTracker.EXPECT().TrackEndMatch(gomock.Any(), gomock.Any(), gomock.Any())

	// win a tutorial 3 match using an incompatible mode
	winner = uint(1)
	tutorialLevel = proto.TutorialLevel_LEVEL_3
	tutorialMode = proto.GameMode_PRACTICE_BOT
	tutorialRewards, err = apitest.Client().BotMatchEnd(ctxUserB, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_COMPLETED,
		TutorialLevel:  &tutorialLevel,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		Mode:           &tutorialMode,
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.Empty(t, tutorialRewards)

	analyticsTracker.EXPECT().TrackEndMatch(gomock.Any(), gomock.Any(), gomock.Any())
	analyticsTracker.EXPECT().TrackTutorialStatus(gomock.Any(), gomock.Any(), gomock.Any())

	// win an invalid tutorial
	winner = uint(1)
	tutorialLevel = proto.TutorialLevel_UNKNOWN
	tutorialMode = proto.GameMode_TUTORIAL
	tutorialRewards, err = apitest.Client().BotMatchEnd(ctxUserB, &proto.BotMatchEndRequest{
		Status:         proto.MatchStatus_COMPLETED,
		TutorialLevel:  &tutorialLevel,
		WinningPlayer:  &winner,
		DeckString:     "SWxHRT01",
		Mode:           &tutorialMode,
		TurnNonce:      15,
		MatchStartedAt: time.Now().UTC().Add(-15 * time.Minute),
	})
	require.NoError(t, err)
	assert.Empty(t, tutorialRewards)
}

func TestUnlockWandererViaPVP(t *testing.T) {
	var err error

	season := data.CurrentSeason()

	_, err = data.DB.SQL().Exec("TRUNCATE accounts CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE levels_per_season CASCADE")
	require.NoError(t, err)

	account1 := &proto.Account{
		Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 1)),
		Name:    "wizard-1",
	}
	err = data.DB.Save(&data.Account{account1})
	require.NoError(t, err)

	account2 := &proto.Account{
		Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 2)),
		Name:    "wizard-2",
	}
	err = data.DB.Save(&data.Account{account2})
	require.NoError(t, err)

	ctx := apitest.ServiceContext()

	totalExp := map[proto.AccountID]uint64{}
	maxUnrankedExp := map[proto.AccountID]uint64{}

	// Create deck strings
	var agyDeckString, strDeckString string
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_AGY, data.SinglePrismDeckSize)
		agyDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_AGY)
		require.NoError(t, err)
		assert.NotEmpty(t, agyDeckString)
	}

	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		strDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		assert.NotEmpty(t, strDeckString)
	}

	{
		err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: agyDeckString,
			AccountID:  account1.ID,
			Class:      proto.DeckClass_AGY,
			Name:       "deck 1",
		}})
		require.NoError(t, err)
	}

	{
		err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: strDeckString,
			AccountID:  account2.ID,
			Class:      proto.DeckClass_STR,
			Name:       "deck 2",
		}})
		require.NoError(t, err)
	}

	deck1, deck2 := agyDeckString, strDeckString

	// Unlock heroes to get match XP
	{
		heroes := []proto.Hero{proto.Hero_ADA, proto.Hero_SAMYA, proto.Hero_FOX}

		for _, hero := range heroes {
			err := data.UnlockHero(data.DB, account1.ID, hero)
			require.NoError(t, err)

			err = data.UnlockHero(data.DB, account2.ID, hero)
			require.NoError(t, err)
		}
	}

	// p1 requires around 40 iterations to unlock WANDERER and p2 requires
	// around 120. we want both players to unlock WANDERER so that they can
	// play against each other.
	account1WasPromoted := false
	account2WasPromoted := false

	for i := 0; i < 150; i++ {
		account1Data, err := apitest.Client().GetAccount(ctx, account1.Address.String())
		require.NoError(t, err)

		account2Data, err := apitest.Client().GetAccount(ctx, account2.Address.String())
		require.NoError(t, err)

		p1ConstructedStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, proto.GameMode_RANKED_CONSTRUCTED, season)
		require.NoError(t, err)
		require.NotZero(t, p1ConstructedStats)

		p1DiscoveryStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, proto.GameMode_RANKED_DISCOVERY, season)
		require.NoError(t, err)
		require.NotZero(t, p1DiscoveryStats)

		p2ConstructedStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account2.ID, proto.GameMode_RANKED_CONSTRUCTED, season)
		require.NoError(t, err)
		require.NotZero(t, p2ConstructedStats)

		p2DiscoveryStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account2.ID, proto.GameMode_RANKED_DISCOVERY, season)
		require.NoError(t, err)
		require.NotZero(t, p2DiscoveryStats)

		require.Equal(t, int32(ranking.DefaultRP), *p1ConstructedStats.Score)
		require.Equal(t, int32(ranking.DefaultRP), *p1DiscoveryStats.Score)

		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)
		gameMode := proto.GameMode_PRACTICE_PVP

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        account1.Address,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        account2.Address,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		winningPlayerNum := uint(1)

		rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Player1DeckString: deck1,
			Player2DeckString: deck2,
			Status:            proto.MatchStatus_COMPLETED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)
		for _, reward := range rewards {
			if reward.Type == proto.RewardType_EXP {
				totalExp[reward.AccountID] += reward.Exp.Amount
			}
		}

		account1Data, err = apitest.Client().GetAccount(ctx, account1.Address.String())
		require.NoError(t, err)

		account1TotalExp := levels.TotalExperience(account1Data.Level, account1Data.Experience)
		require.Equal(t, account1TotalExp, totalExp[account1.ID])

		account2Data, err = apitest.Client().GetAccount(ctx, account2.Address.String())
		require.NoError(t, err)

		account2TotalExp := levels.TotalExperience(account2Data.Level, account2Data.Experience)
		require.Equal(t, account2TotalExp, totalExp[account2.ID])

		if maxUnrankedExp[account1.ID] > 0 {
			require.GreaterOrEqual(t, account1TotalExp, maxUnrankedExp[account1.ID])
		}
		if maxUnrankedExp[account2.ID] > 0 {
			require.GreaterOrEqual(t, account2TotalExp, maxUnrankedExp[account2.ID])
		}

		for _, gameMode := range []proto.GameMode{proto.GameMode_RANKED_CONSTRUCTED, proto.GameMode_RANKED_DISCOVERY} {
			account1StatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, gameMode, season)
			require.NoError(t, err)

			account2StatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account2.ID, gameMode, season)
			require.NoError(t, err)

			if account1TotalExp < playerRank.MinimumExpForRanked {
				require.Equal(t, proto.PlayerRank_UNRANKED, account1StatsAfter.AccountStat.PlayerRank)
				require.LessOrEqual(t, account1Data.Level, uint16(playerRank.MinimumLevelForRanked+0))
				require.Equal(t, int32(ranking.DefaultRP), *account1StatsAfter.Score, "score should remain the same in all PVP matches")
			} else {
				require.GreaterOrEqual(t, account1StatsAfter.AccountStat.PlayerRank, proto.PlayerRank_WANDERER)
				require.Equal(t, uint16(playerRank.MinimumLevelForRanked+0), account1Data.Level)
				if maxUnrankedExp[account1.ID] == 0 {
					maxUnrankedExp[account1.ID] = account1TotalExp
				}
				require.Equal(t, int32(ranking.DefaultRP), *account1StatsAfter.Score, "score should remain the same")
			}

			if account2TotalExp < playerRank.MinimumExpForRanked {
				require.Equal(t, proto.PlayerRank_UNRANKED, account2StatsAfter.AccountStat.PlayerRank)
				require.LessOrEqual(t, account2Data.Level, uint16(playerRank.MinimumLevelForRanked+0))
				require.Equal(t, ranking.DefaultRP, *account2StatsAfter.Score, "score should remain the same in all PVP matches")
			} else {
				require.GreaterOrEqual(t, account2StatsAfter.AccountStat.PlayerRank, proto.PlayerRank_WANDERER)
				require.Equal(t, uint16(playerRank.MinimumLevelForRanked+0), account2Data.Level)
				if maxUnrankedExp[account2.ID] == 0 {
					maxUnrankedExp[account2.ID] = account2TotalExp
				}
				require.Equal(t, ranking.DefaultRP, *account2StatsAfter.Score, "score should remain the same")
			}

			if account1Data.Level >= playerRank.MinimumLevelForRanked {
				require.GreaterOrEqual(t, account1StatsAfter.PlayerRank, proto.PlayerRank_WANDERER)
				account1WasPromoted = true
			} else {
				require.Equal(t, account1StatsAfter.PlayerRank, proto.PlayerRank_UNRANKED)
			}

			if account2Data.Level >= playerRank.MinimumLevelForRanked {
				require.GreaterOrEqual(t, account2StatsAfter.PlayerRank, proto.PlayerRank_WANDERER)
				account2WasPromoted = true
			} else {
				require.Equal(t, account2StatsAfter.PlayerRank, proto.PlayerRank_UNRANKED)
			}
		}

		if account1Data.Level >= playerRank.MinimumLevelForRanked && account2Data.Level >= playerRank.MinimumLevelForRanked {
			break
		}
	}

	require.True(t, account1WasPromoted)
	require.True(t, account2WasPromoted)

	// Make sure player doesn't fall below minimum RP
	for i := 0; i < 10; i++ {
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)

		var gameMode proto.GameMode
		if i%2 == 0 {
			gameMode = proto.GameMode_RANKED_CONSTRUCTED
		} else {
			gameMode = proto.GameMode_RANKED_DISCOVERY
		}

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        account1.Address,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        account2.Address,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		winningPlayerNum := uint(1)

		_, err = apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Player1DeckString: deck1,
			Player2DeckString: deck2,
			Status:            proto.MatchStatus_COMPLETED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)

		account1Data, err := apitest.Client().GetAccount(ctx, account1.Address.String())
		require.NoError(t, err)

		account1TotalExp := levels.TotalExperience(account1Data.Level, account1Data.Experience)
		require.GreaterOrEqual(t, account1TotalExp, uint64(playerRank.MinimumExpForRanked))

		account2Data, err := apitest.Client().GetAccount(ctx, account2.Address.String())
		require.NoError(t, err)
		account2TotalExp := levels.TotalExperience(account2Data.Level, account2Data.Experience)
		require.GreaterOrEqual(t, account2TotalExp, uint64(playerRank.MinimumExpForRanked))

		for _, gameMode := range []proto.GameMode{proto.GameMode_RANKED_CONSTRUCTED, proto.GameMode_RANKED_DISCOVERY} {
			account1StatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, gameMode, season)
			require.NoError(t, err)

			account2StatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account2.ID, gameMode, season)
			require.NoError(t, err)

			require.GreaterOrEqual(t, account1StatsAfter.AccountStat.PlayerRank, proto.PlayerRank_WANDERER)
			require.GreaterOrEqual(t, account2StatsAfter.AccountStat.PlayerRank, proto.PlayerRank_WANDERER)

			require.GreaterOrEqual(t, *account1StatsAfter.AccountStat.Score, ranking.DefaultRP)
			require.GreaterOrEqual(t, *account2StatsAfter.AccountStat.Score, ranking.DefaultRP)
		}
	}
}

func TestPracticePVPAndRankedMatch(t *testing.T) {
	var err error

	season := data.CurrentSeason()

	_, err = data.DB.SQL().Exec("TRUNCATE accounts CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE levels_per_season CASCADE")
	require.NoError(t, err)

	account1 := &proto.Account{
		Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 1)),
		Name:    "wizard-1",
	}
	err = data.DB.Save(&data.Account{account1})
	require.NoError(t, err)

	account2 := &proto.Account{
		Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 2)),
		Name:    "wizard-2",
		Level:   15,
	}
	err = data.DB.Save(&data.Account{account2})
	require.NoError(t, err)

	// Create deck strings
	var agyDeckString, strDeckString string
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_AGY, data.SinglePrismDeckSize)
		agyDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_AGY)
		require.NoError(t, err)
		assert.NotEmpty(t, agyDeckString)
	}
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		strDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		assert.NotEmpty(t, strDeckString)
	}

	{
		err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: agyDeckString,
			AccountID:  account1.ID,
			Class:      proto.DeckClass_AGY,
			Name:       "deck 1",
		}})
		require.NoError(t, err)
	}

	{
		err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: strDeckString,
			AccountID:  account2.ID,
			Class:      proto.DeckClass_STR,
			Name:       "deck 2",
		}})
		require.NoError(t, err)
	}

	deck1, deck2 := agyDeckString, strDeckString

	for i := 0; i < 60; i++ {
		p1ConstructedStats, p1DiscoveryStats, err := apitest.Client().GetAccountStats(apitest.AccountContext(account1.ID), account1.Address.String(), []uint16{season})
		require.NoError(t, err)
		require.Len(t, p1ConstructedStats, 1)
		require.Len(t, p1DiscoveryStats, 1)

		p2ConstructedStats, p2DiscoveryStats, err := apitest.Client().GetAccountStats(apitest.AccountContext(account2.ID), account2.Address.String(), []uint16{season})
		require.NoError(t, err)
		require.Len(t, p2ConstructedStats, 1)
		require.Len(t, p2DiscoveryStats, 1)

		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)

		p1GameMode := proto.GameMode_PRACTICE_PVP
		p2GameMode := proto.GameMode_RANKED_CONSTRUCTED

		matchID, replayID, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        account1.Address,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        account2.Address,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &p1GameMode,
				Player2GameMode: &p2GameMode,
			},
		})
		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		winningPlayerNum := uint(2)

		rewards, err := apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
			MatchID:           matchID,
			Player1DeckString: deck1,
			Player2DeckString: deck2,
			Status:            proto.MatchStatus_COMPLETED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)
		require.NotZero(t, len(rewards))

		account1Data, err := apitest.Client().GetAccount(apitest.ServiceContext(), account1.Address.String())
		require.NoError(t, err)
		account1TotalExp := levels.TotalExperience(account1Data.Level, account1Data.Experience)
		require.GreaterOrEqual(t, account1TotalExp, uint64(0))

		account2Data, err := apitest.Client().GetAccount(apitest.ServiceContext(), account2.Address.String())
		require.NoError(t, err)
		account2TotalExp := levels.TotalExperience(account2Data.Level, account2Data.Experience)
		require.GreaterOrEqual(t, account2TotalExp, uint64(playerRank.MinimumExpForRanked))

		for _, gameMode := range []proto.GameMode{proto.GameMode_RANKED_CONSTRUCTED, proto.GameMode_RANKED_DISCOVERY} {
			account1StatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, gameMode, season)
			require.NoError(t, err)

			account2StatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account2.ID, gameMode, season)
			require.NoError(t, err)

			if gameMode == proto.GameMode_RANKED_CONSTRUCTED {
				require.Equal(t, account1StatsAfter.AccountStat.WinCount, int32(0))
				require.Equal(t, account1StatsAfter.AccountStat.LossCount, int32(0))
				require.Equal(t, account1StatsAfter.AccountStat.TieCount, int32(0))

				require.GreaterOrEqual(t, *account1StatsAfter.AccountStat.Score, int32(0))
				require.GreaterOrEqual(t, account2StatsAfter.AccountStat.WinCount, int32(1))
				require.GreaterOrEqual(t, *account2StatsAfter.AccountStat.Score, int32(1))
			} else {
				require.Equal(t, account1StatsAfter.AccountStat.WinCount, int32(0))
				require.Equal(t, account1StatsAfter.AccountStat.LossCount, int32(0))
				require.Equal(t, account1StatsAfter.AccountStat.TieCount, int32(0))

				require.Equal(t, account2StatsAfter.AccountStat.WinCount, int32(0))
				require.Equal(t, account2StatsAfter.AccountStat.LossCount, int32(0))
				require.Equal(t, account2StatsAfter.AccountStat.TieCount, int32(0))
			}
		}
	}
}

func TestMatchRewards(t *testing.T) {
	var rankStates = apitest.GenerateRankStates()
	var err error

	_, err = data.DB.SQL().Exec("TRUNCATE accounts CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE deck_ranks CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE matches CASCADE")
	require.NoError(t, err)

	season := data.CurrentSeason()

	// prepare accounts
	account1 := &proto.Account{
		Address: apitest.RandomAddress(),
		Name:    fmt.Sprintf("wizard-1000"),
		Level:   playerRank.MinimumLevelForRanked,
	}
	err = data.DB.Save(&data.Account{account1})
	require.NoError(t, err)

	account2 := &proto.Account{
		Address: apitest.RandomAddress(),
		Name:    fmt.Sprintf("wizard-2000"),
		Level:   playerRank.MinimumLevelForRanked,
	}
	err = data.DB.Save(&data.Account{account2})
	require.NoError(t, err)

	account3 := &proto.Account{
		Address: apitest.RandomAddress(),
		Name:    fmt.Sprintf("wizard-3000"),
		Level:   playerRank.MinimumLevelForRanked,
	}
	err = data.DB.Save(&data.Account{account3})
	require.NoError(t, err)

	account4 := &proto.Account{
		Address: apitest.RandomAddress(),
		Name:    fmt.Sprintf("wizard-4000"),
		Level:   playerRank.MinimumLevelForRanked,
	}
	err = data.DB.Save(&data.Account{account4})
	require.NoError(t, err)

	ctx := apitest.ServiceContext()

	// wizard-100 wins and is about to rank-up
	winningPlayerNum := uint(1)

	//loserInitialElo := int32(data.ELO_DEFAULT_RANK)
	//winnerInitialElo := int32(data.ELO_DEFAULT_RANK + 1)
	//account3InitalElo := int32(data.ELO_DEFAULT_RANK)
	//account4InitalElo := int32(data.ELO_DEFAULT_RANK + 200)

	{
		updatedAt := data.TimeNowUTC().Add(-1 * time.Minute)
		rankState := rankStates[proto.PlayerRank_EXPERT][proto.PlayerRankStage_STAGE_I]
		account1Stats := &proto.AccountStat{
			AccountID:       account1.ID,
			GameMode:        proto.GameMode_RANKED_CONSTRUCTED,
			PlayerRank:      proto.PlayerRank_EXPERT,
			PlayerRankState: proto.RankState{*rankState},
			PlayerRankStage: proto.PlayerRankStage_STAGE_I,
			Score:           &rankState.RP,
			Season:          &season,
			UpdatedAt:       &updatedAt,
		}
		err = data.DB.Save(&data.AccountStat{account1Stats})
		require.NoError(t, err)
	}

	{
		updatedAt := data.TimeNowUTC().Add(-2 * time.Minute)
		rankState := rankStates[proto.PlayerRank_EXPERT][proto.PlayerRankStage_STAGE_I]
		account2Stats := &proto.AccountStat{
			AccountID:       account2.ID,
			GameMode:        proto.GameMode_RANKED_CONSTRUCTED,
			PlayerRank:      proto.PlayerRank_EXPERT,
			PlayerRankState: proto.RankState{*rankState},
			PlayerRankStage: proto.PlayerRankStage_STAGE_I,
			Score:           &rankState.RP,
			Season:          &season,
			UpdatedAt:       &updatedAt,
		}
		err = data.DB.Save(&data.AccountStat{account2Stats})
		require.NoError(t, err)
	}

	{
		updatedAt := data.TimeNowUTC().Add(-3 * time.Minute)
		rankState := rankStates[proto.PlayerRank_MASTER][proto.PlayerRankStage_STAGE_NONE]
		account3Stats := &proto.AccountStat{
			AccountID:       account3.ID,
			GameMode:        proto.GameMode_RANKED_CONSTRUCTED,
			PlayerRank:      proto.PlayerRank_GRANDWEAVER,
			PlayerRankState: proto.RankState{*rankState},
			PlayerRankStage: proto.PlayerRankStage_STAGE_NONE,
			Score:           &rankState.RP,
			Season:          &season,
			UpdatedAt:       &updatedAt,
		}
		err = data.DB.Save(&data.AccountStat{account3Stats})
		require.NoError(t, err)
	}

	{
		updatedAt := data.TimeNowUTC().Add(-4 * time.Minute)
		rankState := rankStates[proto.PlayerRank_MASTER][proto.PlayerRankStage_STAGE_NONE]
		account4Stats := &proto.AccountStat{
			AccountID:       account4.ID,
			GameMode:        proto.GameMode_RANKED_CONSTRUCTED,
			PlayerRank:      proto.PlayerRank_GRANDWEAVER,
			PlayerRankState: proto.RankState{*rankState},
			PlayerRankStage: proto.PlayerRankStage_STAGE_NONE,
			Score:           &rankState.RP,
			Season:          &season,
			UpdatedAt:       &updatedAt,
		}
		err = data.DB.Save(&data.AccountStat{account4Stats})
		require.NoError(t, err)
	}

	// Create deck strings
	var agyDeckString, strDeckString string
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_AGY, data.SinglePrismDeckSize)
		agyDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_AGY)
		require.NoError(t, err)
		assert.NotEmpty(t, agyDeckString)
	}
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		strDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		assert.NotEmpty(t, strDeckString)
	}

	startedAt := time.Now()
	endedAt := startedAt.Add(time.Second * 500)
	gameMode := proto.GameMode_RANKED_CONSTRUCTED

	matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
		Player1: &proto.MatchPlayer{
			Address:        account1.Address,
			InitDeckString: agyDeckString,
		},
		Player2: &proto.MatchPlayer{
			Address:        account2.Address,
			InitDeckString: strDeckString,
		},
		Info: &proto.MatchStartInfo{
			Player1GameMode: &gameMode,
			Player2GameMode: &gameMode,
		},
	})
	require.NoError(t, err)
	require.NotZero(t, matchID)
	require.NotZero(t, replayID)

	rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
		MatchID:           matchID,
		Player1DeckString: agyDeckString,
		Player2DeckString: strDeckString,
		Status:            proto.MatchStatus_COMPLETED,
		EndedAt:           &endedAt,
		WinningPlayer:     &winningPlayerNum,
		TurnNonce:         20,
	})
	require.NoError(t, err)
	require.NotNil(t, rewards)

	// assert Rank-UP
	p1RankRewards := []*proto.Reward{}
	p2RankRewards := []*proto.Reward{}
	for _, reward := range rewards {
		if reward.Type == proto.RewardType_RANK {
			if reward.AccountID == account1.ID {
				p1RankRewards = append(p1RankRewards, reward)
			}
			if reward.AccountID == account2.ID {
				p2RankRewards = append(p2RankRewards, reward)
			}
		}
	}
	// should one RewardRank present per winner and loser
	require.Len(t, p1RankRewards, 1)
	require.Len(t, p2RankRewards, 1)

	// winner will stay in the same rank
	assert.Equal(
		t,
		proto.RankData{
			Rank:               proto.PlayerRank_EXPERT,
			RankStage:          proto.PlayerRankStage_STAGE_I,
			Score:              908,
			RequiredRankPoints: 1000,
			RankPosition:       2,
		},
		*p1RankRewards[0].Rank.BeforeMatch,
	)

	assert.Equal(
		t,
		proto.RankData{
			Rank:               proto.PlayerRank_EXPERT,
			RankStage:          proto.PlayerRankStage_STAGE_I,
			Score:              934,
			RequiredRankPoints: 1000,
			RankPosition:       1,
		},
		*p1RankRewards[0].Rank.AfterMatch,
	)

	// loser gets their rank decreased
	assert.Equal(
		t,
		proto.RankData{
			Rank:               proto.PlayerRank_EXPERT,
			RankStage:          proto.PlayerRankStage_STAGE_I,
			Score:              908,
			RequiredRankPoints: 1000,
			RankPosition:       1,
		},
		*p2RankRewards[0].Rank.BeforeMatch,
	)

	assert.Equal(
		t,
		proto.RankData{
			Rank:               proto.PlayerRank_EXPERT,
			RankStage:          proto.PlayerRankStage_STAGE_I,
			Score:              900, // to move to Stage I
			RequiredRankPoints: 1000,
			RankPosition:       2,
		},
		*p2RankRewards[0].Rank.AfterMatch,
	)

	// match until player 1 becomes grandmaster
	var promotionRewards []*proto.Reward
	for i := 0; i < 100; i++ {

		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)
		gameMode := proto.GameMode_RANKED_CONSTRUCTED

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        account1.Address,
				InitDeckString: agyDeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        account2.Address,
				InitDeckString: strDeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Player1DeckString: agyDeckString,
			Player2DeckString: strDeckString,
			Status:            proto.MatchStatus_COMPLETED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)
		require.NotNil(t, rewards)

		// assert Rank-UP
		p1RankRewards := []*proto.Reward{}
		for _, reward := range rewards {
			if reward.Type == proto.RewardType_RANK {
				if reward.AccountID == account1.ID {
					p1RankRewards = append(p1RankRewards, reward)
				}
			}
		}

		// should one RewardRank present per winner and loser
		require.Len(t, p1RankRewards, 1)
		require.Len(t, p2RankRewards, 1)

		if p1RankRewards[0].Rank.AfterMatch.Rank == proto.PlayerRank_GRANDWEAVER {
			promotionRewards = rewards
			break
		}
	}

	assert.NotZero(t, len(promotionRewards))
}

func TestFullRankUp(t *testing.T) {
	const totalAccounts = 30

	apiService := apitest.APIService()

	var err error

	_, err = data.DB.SQL().Exec("TRUNCATE accounts CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE levels_per_season CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE matches CASCADE")
	require.NoError(t, err)

	inviterID1, inviterAddress1, err := apitest.CreateRandomAccount("TestFullRankUp-1")
	require.NoError(t, err)
	inviterID2, inviterAddress2, err := apitest.CreateRandomAccount("TestFullRankUp-2")
	require.NoError(t, err)
	inviterID3, inviterAddress3, err := apitest.CreateRandomAccount("TestFullRankUp-3")
	require.NoError(t, err)

	//inviterID1 = proto.Hash(strings.ToUpper(string(inviterID1)))
	//inviterID3 = proto.Hash(strings.ToUpper(string(inviterID3)))

	season := data.CurrentSeason()

	ctx := apitest.ServiceContext()

	// create 30 new accounts
	accounts := []*proto.Account{}

	for i := 1; i <= totalAccounts; i++ {
		var inviterID *proto.AccountID

		var inviterAddress *proto.Hash

		// assign a fixer inviter and left some accounts without inviter
		switch {
		case i > 3 && i <= 5:
			inviterID = &inviterID1
			inviterAddress = &inviterAddress1
		case i > 5 && i <= 12:
			inviterID = &inviterID2
			inviterAddress = &inviterAddress2
		case i > 12:
			inviterID = &inviterID3
			inviterAddress = &inviterAddress3
		}

		account := &proto.Account{
			Address:     apitest.RandomAddress(),
			Name:        fmt.Sprintf("wizard-%d", i),
			Level:       playerRank.MinimumLevelForRanked,
			InvitedByID: inviterID,
		}

		err := apitest.CreateAccount(&data.Account{Account: account})
		require.NoError(t, err)

		accounts = append(accounts, account)

		if inviterID != nil {
			// make sure the user is included in the inviter's friend list
			_, friends, err := apitest.Client().GetFriendPoints(apitest.AccountContext(*inviterID), inviterAddress.String())
			assert.NotZero(t, len(friends))
			assert.NoError(t, err)
		}
	}

	// Create deck strings
	var agyDeckString, strDeckString string
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_AGY, data.SinglePrismDeckSize)
		agyDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_AGY)
		require.NoError(t, err)
		assert.NotEmpty(t, agyDeckString)
	}
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		strDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		assert.NotEmpty(t, strDeckString)
	}

	for i, acc := range accounts {
		if i%2 == 0 {
			err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
				DeckString: agyDeckString,
				AccountID:  acc.ID,
				Class:      proto.DeckClass_AGY,
				Name:       "deck 1",
			}})
			require.NoError(t, err)
		} else {
			err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
				DeckString: strDeckString,
				AccountID:  acc.ID,
				Class:      proto.DeckClass_STR,
				Name:       "deck 2",
			}})
			require.NoError(t, err)
		}
	}

	// run several win/loss matches between pair and noun accounts
	for i := 0; i < len(accounts); i += 2 {
		winningPlayerNum := uint(1) // player 1 keeps winning, in test scenario

		player1, player2 := accounts[i], accounts[(i+1)%len(accounts)]

		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)

		deck1, deck2 := agyDeckString, strDeckString
		if i%2 == 1 {
			deck1, deck2 = deck2, deck1
		}

		// simulate some ties
		if i > 15 {
			winningPlayerNum = 0
		}

		// number of matches to simulate
		gamesPlayed := 10
		if i >= 25 {
			gamesPlayed = 15
		}

		gameMode := proto.GameMode_RANKED_CONSTRUCTED

		for j := 0; j < gamesPlayed; j++ {
			matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
				Player1: &proto.MatchPlayer{
					Address:        player1.Address,
					InitDeckString: deck1,
				},
				Player2: &proto.MatchPlayer{
					Address:        player2.Address,
					InitDeckString: deck2,
				},
				Info: &proto.MatchStartInfo{
					Player1GameMode: &gameMode,
					Player2GameMode: &gameMode,
				},
			})
			require.NoError(t, err)
			require.NotZero(t, matchID)
			require.NotZero(t, replayID)

			rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
				MatchID:           matchID,
				Player1DeckString: deck1,
				Player2DeckString: deck2,
				Status:            proto.MatchStatus_COMPLETED,
				EndedAt:           &endedAt,
				WinningPlayer:     &winningPlayerNum,
				TurnNonce:         20,
			})
			require.NoError(t, err)
			require.NotNil(t, rewards)

			// test RewardRank type
			p1RankRewards := []*proto.Reward{}
			p2RankRewards := []*proto.Reward{}
			for _, reward := range rewards {
				if reward.Type == proto.RewardType_RANK {
					if reward.AccountID == player1.ID {
						p1RankRewards = append(p1RankRewards, reward)
					}
					if reward.AccountID == player2.ID {
						p2RankRewards = append(p2RankRewards, reward)
					}
				}
			}

			// should one RewardRank present per winner and loser
			assert.Len(t, p1RankRewards, 1)
			assert.Len(t, p2RankRewards, 1)
		}

		// get player 1 games played
		p1GamesPlayed, err := data.DB.AccountStats().GetGamesPlayed(player1.ID, data.CurrentSeason())
		assert.NoError(t, err)
		assert.Equal(t, uint32(gamesPlayed), p1GamesPlayed)

		// get player 2 games played
		p2GamesPlayed, err := data.DB.AccountStats().GetGamesPlayed(player2.ID, data.CurrentSeason())
		assert.NoError(t, err)
		assert.Equal(t, uint32(gamesPlayed), p2GamesPlayed)
	}

	// retrieve friend points after leveling up
	for _, inviter := range []proto.AccountID{inviterID1, inviterID2, inviterID3} {
		totalPoints, err := data.DB.Items().GetStickerPoints(inviter)
		require.NoError(t, err)

		var friends []*data.Account

		err = data.DB.Accounts().Find(db.Cond{"invited_by": inviter}).All(&friends)
		require.NoError(t, err)

		var totalGiftedPoints uint64

		for _, friend := range friends {
			levelsPerSeasons, err := data.DB.LevelsPerSeason().FindByAccountIDAllSeasons(friend.ID)
			require.NoError(t, err)

			for _, levelsPerSeasons := range levelsPerSeasons {
				totalGiftedPoints += levelsPerSeasons.Levels
			}
		}

		assert.Equal(t, int(totalPoints), int(totalGiftedPoints))
	}

	// TODO: separate this test from the other

	_, err = data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	gameModes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
		proto.GameMode_PRACTICE_PVP,
	}

	ranksSeen := map[proto.PlayerRank]map[proto.PlayerRankStage]bool{}

	for _, gameMode := range gameModes {
		for wins := 0; wins < 250; wins++ {
			// Record a match
			winningPlayerNum := uint(1)

			player1address := accounts[0].Address
			player2address := accounts[1].Address

			// rotate win type
			var winMode proto.MatchStatus
			switch wins % 3 {
			case 0:
				winMode = proto.MatchStatus_COMPLETED
			case 1:
				winMode = proto.MatchStatus_ABANDONED
			case 2:
				winMode = proto.MatchStatus_FORFEITED
			}

			if wins%2 == 1 {
				// same player keeps winning, but he's p1 on odd matches and p2 on even
				winningPlayerNum = 2
				player1address = accounts[1].Address
				player2address = accounts[0].Address
			}

			startedAt := time.Now()
			endedAt := startedAt.Add(time.Second * 500)
			deck1, deck2 := agyDeckString, strDeckString

			matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
				Player1: &proto.MatchPlayer{
					Address:        player1address,
					InitDeckString: deck1,
				},
				Player2: &proto.MatchPlayer{
					Address:        player2address,
					InitDeckString: deck2,
				},
				Info: &proto.MatchStartInfo{
					Player1GameMode: &gameMode,
					Player2GameMode: &gameMode,
				},
			})
			require.NoError(t, err)
			require.NotZero(t, matchID)
			require.NotZero(t, replayID)

			rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
				MatchID:           matchID,
				Player1DeckString: deck1,
				Player2DeckString: deck2,
				Status:            winMode,
				EndedAt:           &endedAt,
				WinningPlayer:     &winningPlayerNum,
				TurnNonce:         uint32(wins + 1), // make sure early wins still count, even if xp rewards are affected
			})
			require.NoError(t, err)

			if gameMode == proto.GameMode_PRACTICE_PVP {
				require.Nil(t, rewards)
				continue
			}
			require.NotNil(t, rewards)

			err = apiService.RPC.GrandmastersRecalculator.Recalculate(data.DB, season)
			require.NoError(t, err)

			winnerStats, err := data.DB.AccountStats(nil).FindByAccountIDAndMode(accounts[0].ID, gameMode, season)
			require.NoError(t, err)
			rankingPoints := *winnerStats.AccountStat.Score

			if ranksSeen[winnerStats.PlayerRank] == nil {
				ranksSeen[winnerStats.PlayerRank] = map[proto.PlayerRankStage]bool{}
			}
			ranksSeen[winnerStats.PlayerRank][winnerStats.PlayerRankStage] = true

			switch {
			case rankingPoints < 100:
				assert.Equal(t, proto.PlayerRank_WANDERER, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, winnerStats.PlayerRankStage)
			case rankingPoints < 200:
				assert.Equal(t, proto.PlayerRank_WANDERER, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, winnerStats.PlayerRankStage)
			case rankingPoints < 300:
				assert.Equal(t, proto.PlayerRank_WANDERER, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, winnerStats.PlayerRankStage)
			case rankingPoints < 400:
				assert.Equal(t, proto.PlayerRank_TRAINEE, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, winnerStats.PlayerRankStage)
			case rankingPoints < 500:
				assert.Equal(t, proto.PlayerRank_TRAINEE, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, winnerStats.PlayerRankStage)
			case rankingPoints < 600:
				assert.Equal(t, proto.PlayerRank_TRAINEE, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, winnerStats.PlayerRankStage)
			case rankingPoints < 700:
				assert.Equal(t, proto.PlayerRank_APPRENTICE, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, winnerStats.PlayerRankStage)
			case rankingPoints < 800:
				assert.Equal(t, proto.PlayerRank_APPRENTICE, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, winnerStats.PlayerRankStage)
			case rankingPoints < 900:
				assert.Equal(t, proto.PlayerRank_APPRENTICE, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, winnerStats.PlayerRankStage)
			case rankingPoints < 1000:
				assert.Equal(t, proto.PlayerRank_EXPERT, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, winnerStats.PlayerRankStage)
			case rankingPoints < 1100:
				assert.Equal(t, proto.PlayerRank_EXPERT, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, winnerStats.PlayerRankStage)
			case rankingPoints < 1200:
				assert.Equal(t, proto.PlayerRank_EXPERT, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, winnerStats.PlayerRankStage)
			case rankingPoints >= 1200:
				assert.Equal(t, proto.PlayerRank_GRANDWEAVER, winnerStats.PlayerRank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_NONE, winnerStats.PlayerRankStage)
			}
		}
	}

	for _, rank := range playerRank.PlayerRanksTable {
		if rank.Rank == proto.PlayerRank_UNRANKED {
			continue // all players on ranked are recruits, at least
		}

		if rank.Rank == proto.PlayerRank_MASTER {
			assert.NotNil(t, ranksSeen[proto.PlayerRank_GRANDWEAVER])
			assert.True(t, ranksSeen[proto.PlayerRank_GRANDWEAVER][proto.PlayerRankStage_STAGE_NONE])
		} else {
			assert.NotNil(t, ranksSeen[rank.Rank], "missing rank %v", rank.Rank)
			assert.True(t, ranksSeen[rank.Rank][rank.Stage], "rank stage was not seen: %v.%v", rank.Rank, rank.Stage)
		}
	}
}

func TestRankUpRewards(t *testing.T) {
	var err error
	apiService := apitest.APIService()

	season := data.CurrentSeason()

	_, err = data.DB.SQL().Exec("TRUNCATE accounts CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE levels_per_season CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE feed_events CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE matches CASCADE")
	require.NoError(t, err)

	account1 := &proto.Account{
		Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 1)),
		Name:    "wizard-1",
		Level:   15,
	}
	err = data.DB.Save(&data.Account{account1})
	require.NoError(t, err)

	account2 := &proto.Account{
		Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 2)),
		Name:    "wizard-2",
		Level:   15,
	}
	err = data.DB.Save(&data.Account{account2})
	require.NoError(t, err)

	// Create deck strings
	var agyDeckString, strDeckString string
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_AGY, data.SinglePrismDeckSize)
		agyDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_AGY)
		require.NoError(t, err)
		assert.NotEmpty(t, agyDeckString)
	}
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		strDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		assert.NotEmpty(t, strDeckString)
	}

	{
		err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: agyDeckString,
			AccountID:  account1.ID,
			Class:      proto.DeckClass_AGY,
			Name:       "deck 1",
		}})
		require.NoError(t, err)
	}

	{
		err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: strDeckString,
			AccountID:  account2.ID,
			Class:      proto.DeckClass_STR,
			Name:       "deck 2",
		}})
		require.NoError(t, err)
	}

	afterMatchExpectations := map[proto.PlayerRank]map[proto.PlayerRankStage]struct {
		NextRank      proto.PlayerRank
		NextRankStage proto.PlayerRankStage
		ExtraXP       uint64
		MinScore      int32
	}{
		proto.PlayerRank_UNRANKED: {
			proto.PlayerRankStage_STAGE_NONE: {
				NextRank:      proto.PlayerRank_WANDERER,
				NextRankStage: proto.PlayerRankStage_STAGE_I,
				ExtraXP:       0,
				MinScore:      ranking.DefaultRP,
			},
		},
		proto.PlayerRank_WANDERER: {
			proto.PlayerRankStage_STAGE_I: {
				NextRank:      proto.PlayerRank_WANDERER,
				NextRankStage: proto.PlayerRankStage_STAGE_II,
				ExtraXP:       100,
				MinScore:      100,
			},
			proto.PlayerRankStage_STAGE_II: {
				NextRank:      proto.PlayerRank_WANDERER,
				NextRankStage: proto.PlayerRankStage_STAGE_III,
				ExtraXP:       100,
				MinScore:      200,
			},
			proto.PlayerRankStage_STAGE_III: {
				NextRank:      proto.PlayerRank_TRAINEE,
				NextRankStage: proto.PlayerRankStage_STAGE_I,
				ExtraXP:       100,
				MinScore:      300,
			},
		},
		proto.PlayerRank_TRAINEE: {
			proto.PlayerRankStage_STAGE_I: {
				NextRank:      proto.PlayerRank_TRAINEE,
				NextRankStage: proto.PlayerRankStage_STAGE_II,
				ExtraXP:       100,
				MinScore:      400,
			},
			proto.PlayerRankStage_STAGE_II: {
				NextRank:      proto.PlayerRank_TRAINEE,
				NextRankStage: proto.PlayerRankStage_STAGE_III,
				ExtraXP:       100,
				MinScore:      500,
			},
			proto.PlayerRankStage_STAGE_III: {
				NextRank:      proto.PlayerRank_APPRENTICE,
				NextRankStage: proto.PlayerRankStage_STAGE_I,
				ExtraXP:       200,
				MinScore:      600,
			},
		},
		proto.PlayerRank_APPRENTICE: {
			proto.PlayerRankStage_STAGE_I: {
				NextRank:      proto.PlayerRank_APPRENTICE,
				NextRankStage: proto.PlayerRankStage_STAGE_II,
				ExtraXP:       100,
				MinScore:      700,
			},
			proto.PlayerRankStage_STAGE_II: {
				NextRank:      proto.PlayerRank_APPRENTICE,
				NextRankStage: proto.PlayerRankStage_STAGE_III,
				ExtraXP:       100,
				MinScore:      800,
			},
			proto.PlayerRankStage_STAGE_III: {
				NextRank:      proto.PlayerRank_EXPERT,
				NextRankStage: proto.PlayerRankStage_STAGE_I,
				ExtraXP:       300,
				MinScore:      900,
			},
		},
		proto.PlayerRank_EXPERT: {
			proto.PlayerRankStage_STAGE_I: {
				NextRank:      proto.PlayerRank_EXPERT,
				NextRankStage: proto.PlayerRankStage_STAGE_II,
				ExtraXP:       100,
				MinScore:      1000,
			},
			proto.PlayerRankStage_STAGE_II: {
				NextRank:      proto.PlayerRank_EXPERT,
				NextRankStage: proto.PlayerRankStage_STAGE_III,
				ExtraXP:       100,
				MinScore:      1100,
			},
			proto.PlayerRankStage_STAGE_III: {
				NextRank:      proto.PlayerRank_GRANDWEAVER,
				NextRankStage: proto.PlayerRankStage_STAGE_NONE,
				ExtraXP:       400,
				MinScore:      1200,
			},
		},
	}

	ctx := apitest.ServiceContext()

	deck1, deck2 := agyDeckString, strDeckString

	for i := 0; i < 250; i++ {
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)

		gameMode := proto.GameMode_RANKED_CONSTRUCTED

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        account1.Address,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        account2.Address,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		winningPlayerNum := uint(1)

		rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Player1DeckString: deck1,
			Player2DeckString: deck2,
			Status:            proto.MatchStatus_COMPLETED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)
		require.NotZero(t, len(rewards))

		rankUpRewards := map[proto.AccountID]map[proto.RewardType][]proto.Reward{}

		for _, reward := range rewards {
			if reward.Type != proto.RewardType_RANK && reward.Type != proto.RewardType_EXP {
				continue
			}
			if reward.Type == proto.RewardType_EXP && reward.Exp.Reason != proto.RewardExpReason_RankUp {
				continue
			}
			if rankUpRewards[reward.AccountID] == nil {
				rankUpRewards[reward.AccountID] = map[proto.RewardType][]proto.Reward{}
			}
			if rankUpRewards[reward.AccountID][reward.Type] == nil {
				rankUpRewards[reward.AccountID][reward.Type] = []proto.Reward{}
			}
			rankUpRewards[reward.AccountID][reward.Type] = append(
				rankUpRewards[reward.AccountID][reward.Type],
				*reward,
			)
		}

		var account1RewardRank *proto.RewardRank
		if len(rankUpRewards[account1.ID][proto.RewardType_RANK]) > 0 {
			account1RewardRank = rankUpRewards[account1.ID][proto.RewardType_RANK][0].Rank
		}

		account1Data, err := apitest.Client().GetAccount(ctx, account1.Address.String())
		require.NoError(t, err)
		account1TotalExp := levels.TotalExperience(account1Data.Level, account1Data.Experience)
		require.GreaterOrEqual(t, account1TotalExp, uint64(playerRank.MinimumExpForRanked))

		account2Data, err := apitest.Client().GetAccount(ctx, account2.Address.String())
		require.NoError(t, err)
		account2TotalExp := levels.TotalExperience(account2Data.Level, account2Data.Experience)
		require.GreaterOrEqual(t, account2TotalExp, uint64(playerRank.MinimumExpForRanked))

		err = apiService.RPC.GrandmastersRecalculator.Recalculate(data.DB, season)
		require.NoError(t, err)

		account1StatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, gameMode, season)
		require.NoError(t, err)

		account2StatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account2.ID, gameMode, season)
		require.NoError(t, err)

		var p1IsRankUp bool
		if account1RewardRank != nil {
			p1IsRankUp = account1RewardRank.BeforeMatch.Rank != account1RewardRank.AfterMatch.Rank || (account1RewardRank.BeforeMatch.Rank == account1RewardRank.AfterMatch.Rank && account1RewardRank.BeforeMatch.RankStage != account1RewardRank.AfterMatch.RankStage)
		}

		assert.Equal(t, *account2StatsAfter.AccountStat.Score, ranking.DefaultRP, "loser account should never go below default RP")

		if p1IsRankUp {
			require.NotZero(t, afterMatchExpectations[account1RewardRank.BeforeMatch.Rank], fmt.Sprintf("missing after-match expectations for rank: %v", account1RewardRank.BeforeMatch.Rank))

			expectation, hasExpectation := afterMatchExpectations[account1RewardRank.BeforeMatch.Rank][account1RewardRank.BeforeMatch.RankStage]
			require.True(t, hasExpectation, fmt.Sprintf("missing after-match expectations for rank/stage: %v/%v", account1RewardRank.BeforeMatch.Rank, account1RewardRank.BeforeMatch.RankStage))

			require.Equal(t, expectation.NextRank, account1RewardRank.AfterMatch.Rank)
			require.Equal(t, expectation.NextRankStage, account1RewardRank.AfterMatch.RankStage)
			require.GreaterOrEqual(t, *account1StatsAfter.Score, expectation.MinScore)
		}
	}
}

func TestRankUpAndThenRankDownUntilInconsistentState(t *testing.T) {
	var err error

	season := data.CurrentSeason()

	_, err = data.DB.SQL().Exec("TRUNCATE accounts CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE levels_per_season CASCADE")
	require.NoError(t, err)

	account1 := &proto.Account{
		Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 1)),
		Level:   15,
		Name:    "wizard-1",
	}
	err = data.DB.Save(&data.Account{account1})
	require.NoError(t, err)

	account2 := &proto.Account{
		Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 2)),
		Name:    "wizard-2",
	}
	err = data.DB.Save(&data.Account{account2})
	require.NoError(t, err)

	account3 := &proto.Account{
		Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 3)),
		Name:    "wizard-3",
	}
	err = data.DB.Save(&data.Account{account3})
	require.NoError(t, err)

	// Create deck strings
	var agyDeckString, strDeckString string
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_AGY, data.SinglePrismDeckSize)
		agyDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_AGY)
		require.NoError(t, err)
		assert.NotEmpty(t, agyDeckString)
	}

	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		strDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		assert.NotEmpty(t, strDeckString)
	}

	{
		err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: agyDeckString,
			AccountID:  account1.ID,
			Class:      proto.DeckClass_AGY,
			Name:       "deck 1",
		}})
		require.NoError(t, err)
	}

	{
		err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: strDeckString,
			AccountID:  account2.ID,
			Class:      proto.DeckClass_STR,
			Name:       "deck 2",
		}})
		require.NoError(t, err)
	}

	{
		err := data.DB.Save(&data.Deck{Deck: &proto.Deck{
			DeckString: strDeckString,
			AccountID:  account3.ID,
			Class:      proto.DeckClass_STR,
			Name:       "deck 3",
		}})
		require.NoError(t, err)
	}

	// Unlock heroes to get match XP
	{
		heroes := []proto.Hero{proto.Hero_ADA, proto.Hero_SAMYA, proto.Hero_FOX}

		for _, hero := range heroes {
			err := data.UnlockHero(data.DB, account1.ID, hero)
			require.NoError(t, err)

			err = data.UnlockHero(data.DB, account2.ID, hero)
			require.NoError(t, err)

			err = data.UnlockHero(data.DB, account3.ID, hero)
			require.NoError(t, err)
		}
	}

	ctx := apitest.ServiceContext()

	deck1, deck2 := agyDeckString, strDeckString

	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)

		p1GameMode := proto.GameMode_PRACTICE_PVP
		p2GameMode := proto.GameMode_PRACTICE_PVP

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        account1.Address,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        account2.Address,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &p1GameMode,
				Player2GameMode: &p2GameMode,
			},
		})
		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		winningPlayerNum := uint(1)

		rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Player1DeckString: deck1,
			Player2DeckString: deck2,
			Status:            proto.MatchStatus_COMPLETED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)
		require.NotZero(t, len(rewards))
	}

	for i := 0; i < 3; i++ {
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)

		p1GameMode := proto.GameMode_RANKED_CONSTRUCTED
		p2GameMode := proto.GameMode_PRACTICE_PVP

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        account1.Address,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        account2.Address,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &p1GameMode,
				Player2GameMode: &p2GameMode,
			},
		})
		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		winningPlayerNum := uint(1)

		rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Player1DeckString: deck1,
			Player2DeckString: deck2,
			Status:            proto.MatchStatus_COMPLETED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)
		require.NotZero(t, len(rewards))
	}

	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)

		p1GameMode := proto.GameMode_RANKED_CONSTRUCTED
		p2GameMode := proto.GameMode_PRACTICE_PVP

		matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        account1.Address,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        account2.Address,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &p1GameMode,
				Player2GameMode: &p2GameMode,
			},
		})
		require.NoError(t, err)
		require.NotZero(t, matchID)
		require.NotZero(t, replayID)

		winningPlayerNum := uint(2)

		p1ConstructedStatsBefore, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, proto.GameMode_RANKED_CONSTRUCTED, season)
		require.NoError(t, err)

		rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Player1DeckString: deck1,
			Player2DeckString: deck2,
			Status:            proto.MatchStatus_COMPLETED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)
		require.NotZero(t, len(rewards))

		p1ConstructedStatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, proto.GameMode_RANKED_CONSTRUCTED, season)
		require.NoError(t, err)

		require.Less(t, p1ConstructedStatsAfter.PlayerRank, proto.PlayerRank_APPRENTICE)

		// RP can't go down before a player reaches the Apprentice rank
		require.GreaterOrEqual(t, p1ConstructedStatsAfter.PlayerRankState.RP, p1ConstructedStatsBefore.PlayerRankState.RP)

		// RD remains unchanged for players before reaching the Apprentice rank
		require.Equal(t, ranking.DefaultGlicko_RDInit, p1ConstructedStatsAfter.PlayerRankState.RD)
	}

	// Match against a new player on PVP/CONSTRUCTED
	{
		startedAt := time.Now()
		endedAt := startedAt.Add(time.Second * 500)

		gameMode1 := proto.GameMode_RANKED_CONSTRUCTED
		gameMode2 := proto.GameMode_PRACTICE_PVP

		matchID, _, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        account1.Address,
				InitDeckString: deck1,
			},
			Player2: &proto.MatchPlayer{
				Address:        account3.Address,
				InitDeckString: deck2,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode1,
				Player2GameMode: &gameMode2,
			},
		})
		require.NoError(t, err)
		require.NotZero(t, matchID)

		winningPlayerNum := uint(2)

		p1ConstructedStatsBefore, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, proto.GameMode_RANKED_CONSTRUCTED, season)
		require.NoError(t, err)

		rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
			MatchID:           matchID,
			Player1DeckString: deck1,
			Player2DeckString: deck2,
			Status:            proto.MatchStatus_COMPLETED,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(t, err)
		require.NotZero(t, len(rewards))

		p1ConstructedStatsAfter, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(account1.ID, proto.GameMode_RANKED_CONSTRUCTED, season)
		require.NoError(t, err)

		require.Less(t, p1ConstructedStatsAfter.PlayerRank, proto.PlayerRank_APPRENTICE)

		// RP can't go down before a player reaches the Apprentice rank
		require.GreaterOrEqual(t, p1ConstructedStatsAfter.PlayerRankState.RP, p1ConstructedStatsBefore.PlayerRankState.RP)

		// RD remains unchanged for players before reaching the Apprentice rank
		require.Equal(t, ranking.DefaultGlicko_RDInit, p1ConstructedStatsAfter.PlayerRankState.RD)
	}
}

func TestMasterAndGrandweaver(t *testing.T) {
	const nAccounts = 3 * data.GrandMasterCount

	apiService := apitest.APIService()

	var season = data.CurrentSeason()
	var rankStates = apitest.GenerateRankStates()

	gameMode := proto.GameMode_RANKED_CONSTRUCTED

	var err error

	_, err = data.DB.SQL().Exec("TRUNCATE accounts CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE deck_ranks CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE matches CASCADE")
	require.NoError(t, err)

	ctx := apitest.ServiceContext()

	var accounts []proto.Account
	var accountIDs []proto.AccountID

	for i := 0; i < nAccounts; i++ {
		account := &proto.Account{
			Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 1000+i)),
			Name:    fmt.Sprintf("wizard-%v", 1000+i),
			Level:   playerRank.MinimumLevelForRanked,
		}
		err := data.DB.Save(&data.Account{account})
		require.NoError(t, err)

		accounts = append(accounts, *account)
		accountIDs = append(accountIDs, account.ID)

		var rank proto.PlayerRank

		rankState := rankStates[proto.PlayerRank_MASTER][proto.PlayerRankStage_STAGE_NONE]
		if i < data.GrandMasterCount {
			rank = proto.PlayerRank_GRANDWEAVER
		} else {
			rank = proto.PlayerRank_MASTER
		}

		assert.Equal(t, proto.PlayerRank_MASTER, playerRank.LookupRankByScore(rankState.RP).Rank)

		accountStats := &proto.AccountStat{
			AccountID:       account.ID,
			GameMode:        gameMode,
			PlayerRank:      rank,
			PlayerRankState: proto.RankState{*rankState},
			PlayerRankStage: proto.PlayerRankStage_STAGE_NONE,
			Score:           &rankState.RP,
			Season:          &season,
		}
		err = data.DB.Save(&data.AccountStat{accountStats})
		require.NoError(t, err)
	}

	// add banned grandmasters as noise
	for i := 0; i < 50; i++ {
		account := &proto.Account{
			Address: proto.HashFromString(fmt.Sprintf("0x%0.40x", 2000+i)),
			Name:    fmt.Sprintf("midget-%v", 2000+i),
			Level:   playerRank.MinimumLevelForRanked,
		}
		err := data.DB.Save(&data.Account{account})
		require.NoError(t, err)

		accountIDs = append(accountIDs, account.ID)

		score := int32(1200)
		accountStats := &proto.AccountStat{
			AccountID:  account.ID,
			GameMode:   gameMode,
			Score:      &score,
			PlayerRank: proto.PlayerRank_GRANDWEAVER,
			Status:     proto.AccountStatus_BANNED,
			Season:     &season,
		}
		err = data.DB.Save(&data.AccountStat{accountStats})
		require.NoError(t, err)
	}

	assert.Len(t, accounts, nAccounts)

	// Create deck strings
	var agyDeckString, strDeckString string
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_AGY, data.SinglePrismDeckSize)
		agyDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_AGY)
		require.NoError(t, err)
		assert.NotEmpty(t, agyDeckString)
	}
	{
		var err error
		cardIDs := getDeckForClass(proto.CardClass_STR, data.SinglePrismDeckSize)
		strDeckString, err = data.EncodeDeckString(cardIDs, proto.DeckClass_STR)
		require.NoError(t, err)
		assert.NotEmpty(t, strDeckString)
	}

	startedAt := time.Now()
	endedAt := startedAt.Add(time.Second * 500)

	ranks, err := data.DB.AccountStats().GetRanks(gameMode, accountIDs, season)
	assert.NoError(t, err)

	assert.Len(t, ranks, nAccounts, "only expect ranks from non-banned accounts")

	// check if the initial ranks are there as expected.
	for i, account := range accounts {
		if i < data.GrandMasterCount {
			// Grandmasters
			assert.Equal(t, uint32(i+1), ranks[account.ID])
		} else {
			// Masters
			assert.Equal(t, uint32(i+1-data.GrandMasterCount), ranks[account.ID])
		}
	}

	winnerIndex := data.GrandMasterCount    // First master
	loserIndex := data.GrandMasterCount + 1 // Second master

	winningPlayerNum := uint(1)
	matchID, replayID, err := apitest.Client().InternalMatchStart(ctx, &proto.MatchStartRequest{
		Player1: &proto.MatchPlayer{
			Address:        accounts[winnerIndex].Address,
			InitDeckString: agyDeckString,
		},
		Player2: &proto.MatchPlayer{
			Address:        accounts[loserIndex].Address,
			InitDeckString: strDeckString,
		},
		Info: &proto.MatchStartInfo{
			Player1GameMode: &gameMode,
			Player2GameMode: &gameMode,
		},
	})
	require.NoError(t, err)
	require.NotZero(t, matchID)
	require.NotZero(t, replayID)

	rewards, err := apitest.Client().InternalMatchEnd(ctx, &proto.MatchEndRequest{
		MatchID:           matchID,
		Player1DeckString: agyDeckString,
		Player2DeckString: strDeckString,
		Status:            proto.MatchStatus_COMPLETED,
		EndedAt:           &endedAt,
		WinningPlayer:     &winningPlayerNum,
		TurnNonce:         20,
	})
	require.NoError(t, err)
	require.NotNil(t, rewards)

	winnerRankRewards := []*proto.Reward{}
	loserRankRewards := []*proto.Reward{}
	for _, reward := range rewards {
		if reward.Type == proto.RewardType_RANK {
			if reward.AccountID == accounts[winnerIndex].ID {
				winnerRankRewards = append(winnerRankRewards, reward)
			}
			if reward.AccountID == accounts[loserIndex].ID {
				loserRankRewards = append(loserRankRewards, reward)
			}
		}
	}

	// winner get rank up
	assert.Equal(
		t,
		proto.RankData{
			Rank:               proto.PlayerRank_MASTER,
			Score:              1201,
			ScoreAbove:         1201,
			RequiredRankPoints: 1200,
			RankPosition:       1,
		},
		*winnerRankRewards[0].Rank.BeforeMatch,
	)

	assert.Equal(
		t,
		proto.RankData{
			Rank:               proto.PlayerRank_GRANDWEAVER, // rank up!
			Score:              1221,
			ScoreBelow:         1201,
			RequiredRankPoints: 1200,
			RankPosition:       1,
		},
		*winnerRankRewards[0].Rank.AfterMatch,
		"player should be at the top of the grandmasters now (all others have the same amount of points)",
	)

	// loser stays with the same rank
	assert.Equal(
		t,
		proto.RankData{
			Rank:               proto.PlayerRank_MASTER,
			Score:              1201,
			RequiredRankPoints: 1200,
			ScoreAbove:         1201,
			RankPosition:       2,
		},
		*loserRankRewards[0].Rank.BeforeMatch,
	)

	// but they fall to the bottom of the masters (hard floored)
	assert.Equal(t, int32(1200), loserRankRewards[0].Rank.AfterMatch.Score, "player should have hit hard floor")

	gameModeRankedConstructed := proto.GameMode_RANKED_CONSTRUCTED
	{
		pageSize := uint32(200)

		_, results, err := apitest.Client().ListLeaderboard(context.Background(), &proto.Page{PageSize: &pageSize}, &proto.ListLeaderboardRequest{
			GameMode: &gameModeRankedConstructed,
			Season:   &season,
		})
		require.NoError(t, err)
		require.Equal(t, int(200), len(results))

		playerRanks := map[proto.AccountID]*proto.PlayerRank{}
		for _, result := range results {
			playerRanks[result.Account.ID] = &result.AccountStat.PlayerRank
		}

		// Pick 10 grand masters and ban them (this is going to create holes in the leaderboard)
		i := 0
		for accountID := range playerRanks {
			if i >= 10 {
				break
			}
			if *playerRanks[accountID] == proto.PlayerRank_MASTER {
				continue
			}
			err = data.DB.AccountStats(nil).Find(db.Cond{
				"account_id": accountID,
				"season":     season,
				"game_mode":  gameModeRankedConstructed,
			}).Update(map[string]interface{}{
				"status": proto.AccountStatus_BANNED,
			})
			assert.NoError(t, err)
			i++
		}

		// Expect 10 grandmasters less than before
		_, results, err = apitest.Client().ListLeaderboard(context.Background(), &proto.Page{PageSize: &pageSize}, &proto.ListLeaderboardRequest{
			GameMode: &gameModeRankedConstructed,
			Season:   &season,
		})
		grandmastersCount := 0
		for _, result := range results {
			if result.AccountStat.PlayerRank == proto.PlayerRank_GRANDWEAVER {
				grandmastersCount++
			}
		}
		assert.Equal(t, 90, grandmastersCount)

		// Force recalculation of the leaderboard
		err = apiService.RPC.GrandmastersRecalculator.Recalculate(data.DB, season)
		require.NoError(t, err)

		// Expect same number of results as before
		_, results, err = apitest.Client().ListLeaderboard(context.Background(), &proto.Page{PageSize: &pageSize}, &proto.ListLeaderboardRequest{
			GameMode: &gameModeRankedConstructed,
			Season:   &season,
		})
		require.NoError(t, err)
		require.Equal(t, int(200), len(results))

		promoted := 0
		grandmastersCount = 0
		for _, result := range results {
			if _, ok := playerRanks[result.Account.ID]; !ok {
				promoted++ // this is a new record
			}
			if result.AccountStat.PlayerRank == proto.PlayerRank_GRANDWEAVER {
				grandmastersCount++
			}
		}

		// counting holes left by banned users
		require.Equal(t, 10, promoted)
		require.Equal(t, 100, grandmastersCount)
	}
}

func getDeckForClass(className proto.CardClass, numCards int) []uint64 {
	var cards []*data.Card
	err := data.DB.Cards(nil).Find(db.Cond{
		"class":  className,
		"status": proto.CardStatus_PLAY,
		"id":     db.Lt(20000), // don't include test cards
	}).OrderBy("id").Limit(numCards).All(&cards)
	if err != nil {
		panic(err)
	}

	cardIDs := []uint64{}
	for _, card := range cards {
		cardIDs = append(cardIDs, card.ID)
	}
	return cardIDs
}
