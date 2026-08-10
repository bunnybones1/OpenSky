//go:build integration

package rpc_test

import (
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGMListMatches(t *testing.T) {
	var adminAccountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error
			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMListMatches")
			require.NoError(t, err)
		}
	}

	var err error

	userA := &data.Account{Account: &proto.Account{}}
	userA.ID = apitest.RandomAccountID()
	userA.Address = apitest.RandomAddress()
	userA.Name = "userA1"
	userA.Level = playerRank.MinimumLevelForRanked
	err = data.DB.Save(userA)
	require.NoError(t, err)

	userB := &data.Account{Account: &proto.Account{}}
	userB.ID = apitest.RandomAccountID()
	userB.Address = apitest.RandomAddress()
	userB.Name = "userB1"
	userB.Level = playerRank.MinimumLevelForRanked
	err = data.DB.Save(userB)
	require.NoError(t, err)

	// Auth token to communicate to the api as a service<>service
	serviceAuthToken := apitest.ServiceContext()

	player1DeckString := "SWxHRT"
	player2DeckString := "SWxSTR"

	modes := []proto.GameMode{
		proto.GameMode_PRACTICE_BOT,
		proto.GameMode_CHALLENGE_CONSTRUCTED,
		proto.GameMode_TUTORIAL,
		proto.GameMode_RANKED_DISCOVERY,
	}

	statuses := []proto.MatchStatus{
		proto.MatchStatus_COMPLETED,
		proto.MatchStatus_FORFEITED,
		proto.MatchStatus_ABANDONED,
		proto.MatchStatus_CRASHED,
	}

	durations := []time.Duration{
		-1,
		100,
		200,
		300,
		400,
		500,
	}

	// play several matches to have test data
	for i := 0; i < 123; i++ {
		startedAt := time.Now()

		status := statuses[i%len(statuses)]
		mode := modes[i%len(modes)]
		duration := durations[i%len(durations)]
		s := "s"

		matchID, replayID, err := apitest.Client().InternalMatchStart(serviceAuthToken, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:         userA.Address,
				InitDeckString:  player1DeckString,
				PlayerSessionId: &s,
			},
			Player2: &proto.MatchPlayer{
				Address:         userB.Address,
				InitDeckString:  player2DeckString,
				PlayerSessionId: &s,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &mode,
				Player2GameMode: &mode,
			},
		})
		assert.NoError(t, err)
		assert.NotZero(t, matchID)
		assert.NotZero(t, replayID)

		if duration > 0 {
			endedAt := startedAt.Add(time.Second * duration)
			winningPlayerNum := uint(1)

			_, err = apitest.Client().InternalMatchEnd(serviceAuthToken, &proto.MatchEndRequest{
				MatchID:           matchID,
				Status:            status,
				Player1DeckString: player1DeckString,
				Player2DeckString: player2DeckString,
				EndedAt:           &endedAt,
				WinningPlayer:     &winningPlayerNum,
				TurnNonce:         20,
			})
			assert.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	// List matches with no arguments
	{
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, nil)
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
	}

	// Get completed matches
	{
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_COMPLETED,
			},
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		for _, match := range matches {
			assert.Equal(t, proto.MatchStatus_COMPLETED, match.Match.Status)
			assert.NotZero(t, match.Duration)
		}
	}

	// Get abandoned matches
	{
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_ABANDONED,
			},
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		for _, match := range matches {
			assert.Equal(t, proto.MatchStatus_ABANDONED, match.Match.Status)
		}
	}

	// Get abandoned or forfeited matches
	{
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_ABANDONED,
				proto.MatchStatus_FORFEITED,
			},
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		statuses := map[proto.MatchStatus]int{}
		for _, match := range matches {
			statuses[match.Match.Status]++
		}

		assert.NotZero(t, statuses[proto.MatchStatus_ABANDONED])
		assert.NotZero(t, statuses[proto.MatchStatus_FORFEITED])

		assert.Equal(t, 2, len(statuses))
	}

	// Get abandoned or forfeited matches on practice or challenge modes
	{
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_ABANDONED,
				proto.MatchStatus_FORFEITED,
			},
			Modes: []proto.GameMode{
				proto.GameMode_PRACTICE_BOT,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
			},
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)

		statuses := map[proto.MatchStatus]int{}
		modes := map[proto.GameMode]int{}
		for _, match := range matches {
			statuses[match.Match.Status]++
			modes[match.Match.Player1GameMode]++
		}

		assert.NotZero(t, statuses[proto.MatchStatus_FORFEITED])
		assert.Equal(t, 1, len(statuses))

		assert.NotZero(t, modes[proto.GameMode_CHALLENGE_CONSTRUCTED])
		assert.Equal(t, 1, len(modes))
	}

	// Get in-progress matches with null duration
	{
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_IN_PROGRESS,
			},
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		for _, match := range matches {
			assert.Equal(t, proto.MatchStatus_IN_PROGRESS, match.Match.Status)
			assert.Nil(t, match.Duration)
		}
	}

	// Get abandoned or forfeited matches on practice or challenge modes with
	// duration less than 100s
	{
		duration := "100s"
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_ABANDONED,
				proto.MatchStatus_FORFEITED,
			},
			Modes: []proto.GameMode{
				proto.GameMode_PRACTICE_BOT,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
			},
			MaxDuration: &duration,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 11, len(matches))

		statuses := map[proto.MatchStatus]int{}
		modes := map[proto.GameMode]int{}
		for _, match := range matches {
			statuses[match.Match.Status]++
			modes[match.Match.Player1GameMode]++
			assert.LessOrEqual(t, *match.Duration, time.Duration(100))
		}

		assert.NotZero(t, statuses[proto.MatchStatus_FORFEITED])
		assert.Equal(t, 1, len(statuses))

		assert.NotZero(t, modes[proto.GameMode_CHALLENGE_CONSTRUCTED])
		assert.Equal(t, 1, len(modes))
	}

	// Get abandoned or forfeited matches on practice or challenge modes with
	// duration between 100 and 450s
	{
		minDuration := "100s"
		maxDuration := "450s"
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_ABANDONED,
				proto.MatchStatus_FORFEITED,
			},
			Modes: []proto.GameMode{
				proto.GameMode_PRACTICE_BOT,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
			},
			MinDuration: &minDuration,
			MaxDuration: &maxDuration,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 20, len(matches))

		statuses := map[proto.MatchStatus]int{}
		modes := map[proto.GameMode]int{}
		for _, match := range matches {
			statuses[match.Match.Status]++
			modes[match.Match.Player1GameMode]++
			assert.LessOrEqual(t, *match.Duration, time.Duration(450))
			assert.GreaterOrEqual(t, *match.Duration, time.Duration(100))
		}

		assert.NotZero(t, statuses[proto.MatchStatus_FORFEITED])
		assert.Equal(t, 1, len(statuses))

		assert.NotZero(t, modes[proto.GameMode_CHALLENGE_CONSTRUCTED])
		assert.Equal(t, 1, len(modes))
	}

	// Get abandoned or forfeited matches on practice or challenge modes with
	// duration between 100 and 450s (same thing but duration boundaries
	// reversed)
	{
		maxDuration := "450s"
		minDuration := "100s"
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_ABANDONED,
				proto.MatchStatus_FORFEITED,
			},
			Modes: []proto.GameMode{
				proto.GameMode_PRACTICE_BOT,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
			},
			MaxDuration: &maxDuration,
			MinDuration: &minDuration,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 20, len(matches))

		statuses := map[proto.MatchStatus]int{}
		modes := map[proto.GameMode]int{}
		for _, match := range matches {
			statuses[match.Match.Status]++
			modes[match.Match.Player1GameMode]++
		}

		assert.NotZero(t, statuses[proto.MatchStatus_FORFEITED])
		assert.Equal(t, 1, len(statuses))

		assert.NotZero(t, modes[proto.GameMode_CHALLENGE_CONSTRUCTED])
		assert.Equal(t, 1, len(modes))
	}

	// Get matches with duration between 600s and 700s
	{
		minDuration := "600s"
		maxDuration := "700s"
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_ABANDONED,
				proto.MatchStatus_FORFEITED,
			},
			Modes: []proto.GameMode{
				proto.GameMode_PRACTICE_BOT,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
			},
			MaxDuration: &maxDuration,
			MinDuration: &minDuration,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 0, len(matches))
	}

	// Get reviewed matches (expecting none at this time)
	{
		reviewed := true
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Reviewed: &reviewed,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.Zero(t, len(matches))
	}

	// Get non-reviewed matches
	{
		reviewed := false
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Reviewed: &reviewed,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotZero(t, len(matches))
	}

	// Get some completed matches and mark them as reviewed
	{
		pageSize := uint32(200)
		pageReq := &proto.Page{
			PageSize: &pageSize,
		}

		isNotReviewed := false
		page, matches, err := apitest.Client().GMListMatches(ctx, pageReq, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_COMPLETED,
			},
			Reviewed: &isNotReviewed,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)

		completedMatches := len(matches)

		for _, match := range matches {
			assert.Equal(t, proto.MatchStatus_COMPLETED, match.Match.Status)

			_, err = apitest.Client().GMSetReviewed(ctx, match.Match.ID, true)
			assert.NoError(t, err)
		}

		// Expect that all completed matches are reviewed
		page, matches, err = apitest.Client().GMListMatches(ctx, pageReq, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_COMPLETED,
			},
			Reviewed: &isNotReviewed,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.Zero(t, len(matches))

		// Expect that all completed matches are reviewed
		page, matches, err = apitest.Client().GMListMatches(ctx, pageReq, &proto.GMListMatchesRequest{
			Statuses: []proto.MatchStatus{
				proto.MatchStatus_COMPLETED,
			},
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		reviewedMatches := len(matches)
		assert.NotZero(t, reviewedMatches)
		assert.Equal(t, completedMatches, reviewedMatches)
		for _, match := range matches {
			assert.Equal(t, proto.MatchStatus_COMPLETED, match.Match.Status)
			assert.True(t, match.Reviewed)
		}
	}

	// Get reviewed matches (expecting some completed matches)
	{
		pageSize := uint32(200)
		pageReq := &proto.Page{
			PageSize: &pageSize,
		}

		reviewed := true
		page, matches, err := apitest.Client().GMListMatches(ctx, pageReq, &proto.GMListMatchesRequest{
			Reviewed: &reviewed,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotZero(t, len(matches))

		for _, match := range matches {
			assert.Equal(t, proto.MatchStatus_COMPLETED, match.Match.Status)
			assert.NotZero(t, match.Duration)

			// set reviewed matches back to unreviewed
			_, err = apitest.Client().GMSetReviewed(ctx, match.Match.ID, false)
			assert.NoError(t, err)
		}
	}

	// Get reviewed matches (expecting none)
	{
		reviewed := true
		page, matches, err := apitest.Client().GMListMatches(ctx, nil, &proto.GMListMatchesRequest{
			Reviewed: &reviewed,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.Zero(t, len(matches))
	}
}

func BenchmarkGMListMatches(b *testing.B) {
	var err error

	serviceAuthToken := apitest.ServiceContext()

	_, err = data.DB.SQL().Exec("TRUNCATE accounts CASCADE")
	require.NoError(b, err)

	_, err = data.DB.SQL().Exec("TRUNCATE items CASCADE")
	require.NoError(b, err)

	_, err = data.DB.SQL().Exec("TRUNCATE matches CASCADE")
	require.NoError(b, err)

	users := []data.Account{}

	for i := 0; i < 1000; i++ {
		user := data.Account{Account: &proto.Account{}}

		user.ID = apitest.RandomAccountID()
		user.Address = apitest.RandomAddress()

		region := proto.Region(fmt.Sprintf("r-%02d", i))
		tagArtID := fmt.Sprintf("a-%06d", i)

		user.Name = fmt.Sprintf("user-%06d", i)
		user.Region = &region
		user.TagArtID = &tagArtID

		err := data.DB.Save(&user)
		require.NoError(b, err)
		users = append(users, user)

		for j := 0; j < 5; j++ {
			item := data.Item{Item: &proto.Item{}}
			item.AccountID = user.ID
			item.TokenID = uint64(j + 1)
			item.ItemType = proto.ItemType_SW_CRYSTALS
			item.Balance = prototyp.NewBigInt(100)
			err := data.DB.Save(&item)
			require.NoError(b, err)
		}
	}

	player1InitDeckString := "SWxHRT00"
	player2InitDeckString := "SWxSTR00"

	player1DeckString := "SWxHRT01"
	player2DeckString := "SWxSTR01"

	for i := 0; i < 1000; i++ {
		var user1, user2 int

		gameMode := proto.GameMode_CHALLENGE_CONSTRUCTED

		user1 = rand.Intn(len(users))
		for {
			user2 = rand.Intn(len(users))
			if user1 != user2 {
				break
			}
		}

		matchID, _, err := apitest.Client().InternalMatchStart(serviceAuthToken, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        users[user1].Address,
				InitDeckString: player1InitDeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        users[user2].Address,
				InitDeckString: player2InitDeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &gameMode,
				Player2GameMode: &gameMode,
			},
		})
		require.NoError(b, err)

		endedAt := time.Now().Add(time.Second * 60)
		winningPlayerNum := uint(1)
		_, err = apitest.Client().InternalMatchEnd(serviceAuthToken, &proto.MatchEndRequest{
			MatchID:           matchID,
			Status:            proto.MatchStatus_COMPLETED,
			Player1DeckString: player1DeckString,
			Player2DeckString: player2DeckString,
			EndedAt:           &endedAt,
			WinningPlayer:     &winningPlayerNum,
			TurnNonce:         20,
		})
		require.NoError(b, err)
	}

	b.ResetTimer()
	for n := 0; n < b.N; n++ {
		b.StartTimer()
		page, matches, err := apitest.Client().GMListMatches(serviceAuthToken, nil, nil)
		b.StopTimer()

		assert.NoError(b, err)
		assert.NotNil(b, page)
		assert.NotNil(b, matches)

		for i := 0; i < len(matches); i++ {
			assert.NotZero(b, matches[i].Match.Player1.Address)
			assert.NotZero(b, matches[i].Match.Player1.Name)
			assert.NotZero(b, matches[i].Match.Player1.Region)
			assert.NotZero(b, matches[i].Match.Player1.TagArtID)
			assert.NotZero(b, matches[i].Match.Player1.CrystalID)
			assert.NotZero(b, matches[i].Match.Player1.InitDeckString)
			assert.NotZero(b, matches[i].Match.Player1.DeckString)

			assert.NotEqual(b, matches[i].Match.Player1.Address, matches[i].Match.Player2.Address)
			assert.NotEqual(b, matches[i].Match.Player1.Name, matches[i].Match.Player2.Name)
			assert.NotEqual(b, matches[i].Match.Player1.TagArtID, matches[i].Match.Player2.TagArtID)

			assert.Equal(b, player1InitDeckString, matches[i].Match.Player1.InitDeckString)
			assert.Equal(b, player2InitDeckString, matches[i].Match.Player2.InitDeckString)

			assert.Equal(b, player1DeckString, matches[i].Match.Player1.DeckString)
			assert.Equal(b, player2DeckString, matches[i].Match.Player2.DeckString)
		}

	}
}
