//go:build integration

package rpc_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"math"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/proto"
	rpcmock "github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestListMatches(t *testing.T) {
	var err error

	_, err = data.DB.SQL().Exec("TRUNCATE matches RESTART IDENTITY CASCADE")
	require.NoError(t, err)

	_, err = data.DB.SQL().Exec("TRUNCATE accounts RESTART IDENTITY CASCADE")
	require.NoError(t, err)

	sortOrderDesc := proto.SortOrder_DESC
	sortOrderAsc := proto.SortOrder_ASC

	userA := &data.Account{Account: &proto.Account{}}
	userA.Address = apitest.RandomAddress()
	userA.Name = "userA1"
	userA.Level = playerRank.MinimumLevelForRanked
	err = data.DB.Save(userA)
	require.NoError(t, err)

	userB := &data.Account{Account: &proto.Account{}}
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
		proto.GameMode_RANKED_DISCOVERY,
		proto.GameMode_CHALLENGE_CONSTRUCTED,
	}

	statuses := []proto.MatchStatus{
		proto.MatchStatus_COMPLETED,
		proto.MatchStatus_FORFEITED,
	}

	startedAt := time.Now()

	generatedSamples := 41

	// play several matches to have test data
	for i := 0; i < generatedSamples; i++ {
		status := statuses[i%len(statuses)]
		mode := modes[i%len(modes)]
		duration := time.Second * 100

		matchID, replayID, err := apitest.Client().InternalMatchStart(serviceAuthToken, &proto.MatchStartRequest{
			Player1: &proto.MatchPlayer{
				Address:        userA.Address,
				InitDeckString: player1DeckString,
			},
			Player2: &proto.MatchPlayer{
				Address:        userB.Address,
				InitDeckString: player2DeckString,
			},
			Info: &proto.MatchStartInfo{
				Player1GameMode: &mode,
				Player2GameMode: &mode,
			},
		})
		assert.NoError(t, err)
		assert.NotZero(t, matchID)
		assert.NotZero(t, replayID)

		endedAt := startedAt.Add(duration + time.Second*time.Duration(i))
		winningPlayerNum := uint(1)

		_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
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

	address, err := apitest.CreateRandomAdminAccount("TestListMatches")
	require.NoError(t, err)

	ctx := apitest.AccountContext(address)

	t.Run("list matches with no arguments", func(t *testing.T) {
		t.Parallel()

		page, matches, err := apitest.Client().ListMatches(ctx, nil, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)

		assert.Equal(t, 20, len(matches))
		assert.NotEmpty(t, page.Before)
		assert.NotEmpty(t, page.After)
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)
	})

	t.Run("list matches with a custom page size", func(t *testing.T) {
		t.Parallel()

		pageSize := uint32(17)
		page, matches, err := apitest.Client().ListMatches(ctx, &proto.Page{
			PageSize: &pageSize,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)

		assert.Equal(t, pageSize, uint32(len(matches)))
		assert.NotEmpty(t, page.Before)
		assert.NotEmpty(t, page.After)
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)
	})

	t.Run("list first and next page in descending order", func(t *testing.T) {
		t.Parallel()

		sortBy := []*proto.SortBy{
			{
				Column: "matches.id",
				Order:  &sortOrderDesc,
			},
		}

		page, matches, err := apitest.Client().ListMatches(ctx, &proto.Page{
			Sort: sortBy,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)

		assert.Equal(t, 20, len(matches))
		assert.NotEmpty(t, page.Before)
		assert.NotEmpty(t, page.After)
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)

		first, last := *page.Before, *page.After

		// next page
		page, matches, err = apitest.Client().ListMatches(ctx, &proto.Page{
			Sort:   sortBy,
			Before: &last,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 20, len(matches), "expecting at least one more page")
		assert.True(t, *page.HasBefore)
		assert.True(t, *page.HasAfter)

		// previous page
		page, matches, err = apitest.Client().ListMatches(ctx, &proto.Page{
			Sort:  sortBy,
			After: &first,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 0, len(matches), "there's no page before the first one")
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)
	})

	t.Run("list first and next page in descending order (sort by custom key)", func(t *testing.T) {
		t.Parallel()

		sortBy := []*proto.SortBy{
			{
				Column: "started_at",
				Order:  &sortOrderDesc,
			},
		}

		page, matches, err := apitest.Client().ListMatches(ctx, &proto.Page{
			Sort: sortBy,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)

		assert.Equal(t, 20, len(matches))
		assert.NotEmpty(t, page.Before)
		assert.NotEmpty(t, page.After)
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)

		first, last := *page.Before, *page.After

		// next page
		page, matches, err = apitest.Client().ListMatches(ctx, &proto.Page{
			Sort:   sortBy,
			Before: &last,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 20, len(matches), "expecting at least one more page")
		assert.True(t, *page.HasBefore)
		assert.True(t, *page.HasAfter)

		// previous page
		page, matches, err = apitest.Client().ListMatches(ctx, &proto.Page{
			Sort:  sortBy,
			After: &first,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 0, len(matches), "there's no page before the first one")
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)
	})

	t.Run("list first and next page in ascending order", func(t *testing.T) {
		t.Parallel()

		sortBy := []*proto.SortBy{
			{
				Column: "matches.id",
				Order:  &sortOrderAsc,
			},
		}

		page, matches, err := apitest.Client().ListMatches(ctx, &proto.Page{
			Sort: sortBy,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)

		assert.Equal(t, 20, len(matches))
		assert.NotEmpty(t, page.Before)
		assert.NotEmpty(t, page.After)
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)

		first, last := *page.Before, *page.After

		// next page
		page, matches, err = apitest.Client().ListMatches(ctx, &proto.Page{
			Sort:   sortBy,
			Before: &last,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 20, len(matches), "expecting at least one more page")
		assert.True(t, *page.HasBefore)
		assert.True(t, *page.HasAfter)

		// previous page
		page, matches, err = apitest.Client().ListMatches(ctx, &proto.Page{
			Sort:  sortBy,
			After: &first,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 0, len(matches), "there's no page before the first one")
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)
	})

	t.Run("list first and next page in ascending order", func(t *testing.T) {
		t.Parallel()

		sortBy := []*proto.SortBy{
			{
				Column: "started_at",
				Order:  &sortOrderAsc,
			},
		}

		page, matches, err := apitest.Client().ListMatches(ctx, &proto.Page{
			Sort: sortBy,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)

		assert.Equal(t, 20, len(matches))
		assert.NotEmpty(t, page.Before)
		assert.NotEmpty(t, page.After)
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)

		first, last := *page.Before, *page.After

		// next page
		page, matches, err = apitest.Client().ListMatches(ctx, &proto.Page{
			Sort:   sortBy,
			Before: &last,
		}, &proto.ListMatchesRequest{
			AccountAddress: &userA.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 20, len(matches), "expecting at least one more page")
		assert.True(t, *page.HasBefore)
		assert.True(t, *page.HasAfter)

		// previous page
		page, matches, err = apitest.Client().ListMatches(ctx, &proto.Page{
			Sort:  sortBy,
			After: &first,
		}, nil)
		assert.NoError(t, err)
		assert.NotNil(t, page)
		assert.NotNil(t, matches)
		assert.Equal(t, 0, len(matches), "there's no page before the first one")
		assert.True(t, *page.HasBefore)
		assert.False(t, *page.HasAfter)
	})

	t.Run("going through all pages with an ASC cursor", func(t *testing.T) {
		t.Parallel()

		var after string
		var before string

		total := 0
		for i := 0; true; i++ {
			sortBy := []*proto.SortBy{
				{
					Column: "matches.id",
					Order:  &sortOrderAsc,
				},
			}
			pageConf := &proto.Page{
				Sort: sortBy,
			}
			if after != "" {
				pageConf.Before = &after
			}
			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			require.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.After != nil {
				after = *page.After
			}

			switch {
			case i == 0:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			case total == generatedSamples:
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if len(matches) == 0 {
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
				break
			}

			expectedCursorJSON, err := json.Marshal([]interface{}{
				strconv.Itoa(int(math.Min(float64(generatedSamples), float64(20*(i+1))))),
			})
			require.NoError(t, err)

			assert.Equal(t,
				base64.StdEncoding.EncodeToString(expectedCursorJSON),
				after,
				"wrong cursor",
			)
		}

		// Going in reverse order
		before = after

		total = 0
		for i := 0; ; i++ {

			expectedCursorJSON, err := json.Marshal([]interface{}{
				strconv.Itoa(int(math.Max(1, float64(generatedSamples-20*i)))),
			})
			require.NoError(t, err)

			assert.Equal(t,
				base64.StdEncoding.EncodeToString(expectedCursorJSON),
				before,
				"wrong cursor",
			)

			sortBy := []*proto.SortBy{
				{
					Column: "matches.id",
					Order:  &sortOrderAsc,
				},
			}
			pageConf := &proto.Page{
				Sort:  sortBy,
				After: &before,
			}

			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			assert.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.Before != nil {
				before = *page.Before
			}

			switch {
			case i == 0:
				// this happens because we're assuming this is the case when we have an
				// After cursor, not actually true in this case, but we cant't know if
				// it's true or not without executing an extra query.
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			case total+1 == generatedSamples:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if len(matches) == 0 {
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
				break
			}
		}

		assert.Equal(t, generatedSamples, total+1)
	})

	t.Run("going through all pages until HasBefore is false", func(t *testing.T) {
		t.Parallel()

		var after string

		total := 0
		for i := 0; true; i++ {
			sortBy := []*proto.SortBy{
				{
					Column: "started_at",
					Order:  &sortOrderAsc,
				},
			}
			pageConf := &proto.Page{
				Sort: sortBy,
			}
			if after != "" {
				pageConf.Before = &after
			}
			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			require.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.After != nil {
				after = *page.After
			}

			switch {
			case i == 0:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			case total == generatedSamples:
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if *page.HasBefore == false {
				assert.NotZero(t, len(matches))
				break
			}
		}

		assert.Equal(t, generatedSamples, total)
	})

	t.Run("going through all pages until HasBefore is false", func(t *testing.T) {
		t.Parallel()

		var after string

		total := 0
		for i := 0; true; i++ {
			sortBy := []*proto.SortBy{
				{
					Column: "started_at",
					Order:  &sortOrderDesc,
				},
			}
			pageConf := &proto.Page{
				Sort: sortBy,
			}
			if after != "" {
				pageConf.Before = &after
			}
			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			require.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.After != nil {
				after = *page.After
			}

			switch {
			case i == 0:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			case total == generatedSamples:
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if *page.HasBefore == false {
				assert.NotZero(t, len(matches))
				break
			}
		}

		assert.Equal(t, generatedSamples, total)
	})

	t.Run("going through all pages with an ASC cursor and a custom key", func(t *testing.T) {
		t.Parallel()

		var after string
		var before string

		total := 0
		for i := 0; true; i++ {
			sortBy := []*proto.SortBy{
				{
					Column: "started_at",
					Order:  &sortOrderAsc,
				},
			}
			pageConf := &proto.Page{
				Sort: sortBy,
			}
			if after != "" {
				pageConf.Before = &after
			}
			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			require.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.After != nil {
				after = *page.After
			}

			switch {
			case i == 0:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			case total == generatedSamples:
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if len(matches) == 0 {
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
				break
			}

			decodedCursor, err := base64.StdEncoding.DecodeString(after)
			require.NoError(t, err)

			cursor := []interface{}{}
			err = json.Unmarshal(decodedCursor, &cursor)
			require.NoError(t, err)

			assert.Equal(t,
				strconv.Itoa(int(math.Min(float64(generatedSamples), float64(20*(i+1))))),
				cursor[0].(string),
				"wrong cursor",
			)
		}

		// Going in reverse order
		before = after

		total = 0
		for i := 0; ; i++ {

			decodedCursor, err := base64.StdEncoding.DecodeString(before)
			require.NoError(t, err)

			cursor := []interface{}{}
			err = json.Unmarshal(decodedCursor, &cursor)
			require.NoError(t, err)

			assert.Equal(t,
				strconv.Itoa(int(math.Max(1, float64(generatedSamples-20*i)))),
				cursor[0].(string),
				"wrong cursor",
			)

			sortBy := []*proto.SortBy{
				{
					Column: "started_at",
					Order:  &sortOrderAsc,
				},
			}
			pageConf := &proto.Page{
				Sort:  sortBy,
				After: &before,
			}

			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			assert.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.Before != nil {
				before = *page.Before
			}

			switch {
			case i == 0:
				// this happens because we're assuming this is the case when we have an
				// After cursor, not actually true in this case, but we cant't know if
				// it's true or not without executing an extra query.
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			case total+1 == generatedSamples:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if len(matches) == 0 {
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
				break
			}
		}

		assert.Equal(t, generatedSamples, total+1)
	})

	t.Run("going through all pages with a DESC cursor", func(t *testing.T) {
		t.Parallel()

		var after string
		var before string

		total := 0
		for i := 0; true; i++ {
			sortBy := []*proto.SortBy{
				{
					Column: "matches.id",
					Order:  &sortOrderDesc,
				},
			}
			pageConf := &proto.Page{
				Sort: sortBy,
			}
			if after != "" {
				pageConf.Before = &after
			}
			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			require.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.After != nil {
				after = *page.After
			}

			switch {
			case i == 0:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			case total == generatedSamples:
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if len(matches) == 0 {
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
				break
			}

			expectedCursorJSON, err := json.Marshal([]interface{}{
				strconv.Itoa(int(math.Max(1, float64(generatedSamples-20*(i+1)+1)))),
			})
			require.NoError(t, err)

			assert.Equal(t,
				base64.StdEncoding.EncodeToString(expectedCursorJSON),
				after,
				"wrong cursor",
			)
		}

		// Going in reverse order
		before = after

		total = 0
		for i := 0; ; i++ {

			expectedCursorJSON, err := json.Marshal([]interface{}{
				strconv.Itoa(int(math.Min(float64(generatedSamples), float64(20*i+1)))),
			})
			require.NoError(t, err)

			assert.Equal(t,
				base64.StdEncoding.EncodeToString(expectedCursorJSON),
				before,
				"wrong cursor",
			)

			sortBy := []*proto.SortBy{
				{
					Column: "matches.id",
					Order:  &sortOrderDesc,
				},
			}
			pageConf := &proto.Page{
				Sort:  sortBy,
				After: &before,
			}

			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			assert.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.Before != nil {
				before = *page.Before
			}

			switch {
			case i == 0:
				// this happens because we're assuming this is the case when we have an
				// After cursor, not actually true in this case, but we cant't know if
				// it's true or not without executing an extra query.
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			case total+1 == generatedSamples:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if len(matches) == 0 {
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
				break
			}
		}

		assert.Equal(t, generatedSamples, total+1)
	})

	t.Run("going through all pages with an ASC cursor and a custom key", func(t *testing.T) {
		t.Parallel()

		var after string
		var before string

		total := 0
		for i := 0; true; i++ {
			sortBy := []*proto.SortBy{
				{
					Column: "started_at",
					Order:  &sortOrderDesc,
				},
			}
			pageConf := &proto.Page{
				Sort: sortBy,
			}
			if after != "" {
				pageConf.Before = &after
			}
			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			require.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.After != nil {
				after = *page.After
			}

			switch {
			case i == 0:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			case total == generatedSamples:
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if len(matches) == 0 {
				assert.False(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
				break
			}

			decodedCursor, err := base64.StdEncoding.DecodeString(after)
			require.NoError(t, err)

			cursor := []interface{}{}
			err = json.Unmarshal(decodedCursor, &cursor)
			require.NoError(t, err)

			assert.Equal(t,
				strconv.Itoa(int(math.Max(1, float64(generatedSamples-20*(i+1)+1)))),
				cursor[0].(string),
				"wrong cursor",
			)
		}

		// Going in reverse order
		before = after

		total = 0
		for i := 0; ; i++ {

			decodedCursor, err := base64.StdEncoding.DecodeString(before)
			require.NoError(t, err)

			cursor := []interface{}{}
			err = json.Unmarshal(decodedCursor, &cursor)
			require.NoError(t, err)

			assert.Equal(t,
				strconv.Itoa(int(math.Min(float64(generatedSamples), float64(20*i+1)))),
				cursor[0].(string),
				"wrong cursor",
			)

			sortBy := []*proto.SortBy{
				{
					Column: "started_at",
					Order:  &sortOrderDesc,
				},
			}
			pageConf := &proto.Page{
				Sort:  sortBy,
				After: &before,
			}

			page, matches, err := apitest.Client().ListMatches(ctx, pageConf, &proto.ListMatchesRequest{
				AccountAddress: &userA.Address,
			})
			assert.NoError(t, err)
			assert.NotNil(t, page)

			total += len(matches)

			if page.Before != nil {
				before = *page.Before
			}

			switch {
			case i == 0:
				// this happens because we're assuming this is the case when we have an
				// After cursor, not actually true in this case, but we cant't know if
				// it's true or not without executing an extra query.
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			case total+1 == generatedSamples:
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
			default:
				assert.True(t, *page.HasBefore)
				assert.True(t, *page.HasAfter)
			}

			if len(matches) == 0 {
				assert.True(t, *page.HasBefore)
				assert.False(t, *page.HasAfter)
				break
			}
		}

		assert.Equal(t, generatedSamples, total+1)
	})
}

func TestGetMatch(t *testing.T) {
	var accountID, accountID2, accountID3 proto.AccountID

	var address, address2 proto.Hash

	var matchesByMode map[proto.GameMode]uint64

	// Setup
	{
		var conquestStateManager *rpcmock.MockConquestStateManager

		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestStateManager = rpcmock.NewMockConquestStateManager(ctrl)
			conquestStateManager.EXPECT().UpdateProgress(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes() // Called when conquest matches end

			conquestV2PointsUpdater := rpcmock.NewMockConquestV2PointsUpdater(ctrl)
			conquestV2PointsUpdater.EXPECT().Update(gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes() // Called when conquest matches end

			apiService := apitest.APIService()

			originalConquestStateManager := apiService.RPC.ConquestStateManager
			originalConquestV2PointsUpdater := apiService.RPC.ConquestV2PointsUpdater

			apiService.RPC.ConquestStateManager = conquestStateManager
			apiService.RPC.ConquestV2PointsUpdater = conquestV2PointsUpdater

			t.Cleanup(func() {
				apiService.RPC.ConquestStateManager = originalConquestStateManager
				apiService.RPC.ConquestV2PointsUpdater = originalConquestV2PointsUpdater
			})
		}

		// Create accounts
		{
			var err error
			accountID, address, err = apitest.CreateRandomAccount("TestGetMatch-1")
			require.NoError(t, err)
			accountID2, address2, err = apitest.CreateRandomAccount("TestGetMatch-2")
			require.NoError(t, err)
			accountID3, _, err = apitest.CreateRandomAccount("TestGetMatch-3")
			require.NoError(t, err)
		}

		// Set minimum level to play ranked
		{
			var err error

			err = setMinimumLevelForRanked(accountID)
			require.NoError(t, err)

			err = setMinimumLevelForRanked(accountID2)
			require.NoError(t, err)

			err = setMinimumLevelForRanked(accountID3)
			require.NoError(t, err)
		}

		// Create conquests
		{
			createConquest(t, accountID, proto.GameMode_CONQUEST_DISCOVERY, proto.ConquestStatus_IN_PROGRESS, 1, nil)
			createConquest(t, accountID2, proto.GameMode_CONQUEST_DISCOVERY, proto.ConquestStatus_IN_PROGRESS, 1, nil)

			t.Cleanup(func() {
				err := data.DB.Conquests().Find(db.Cond{"account_id": db.In(accountID, accountID2)}).Delete()
				require.NoError(t, err)
			})
		}

		// Create matches
		{
			matchesByMode = map[proto.GameMode]uint64{
				proto.GameMode_RANKED_DISCOVERY:    0,
				proto.GameMode_CONQUEST_DISCOVERY:  0,
				proto.GameMode_CHALLENGE_DISCOVERY: 0,
			}

			deckClass := proto.DeckClass_STR
			deckString := "SWxSTR"
			startedAt := time.Now()

			// play several matches to have test data
			for mode := range matchesByMode {
				duration := time.Second * 100

				matchID, _, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
					Player1: &proto.MatchPlayer{
						Address:        address,
						InitDeckString: deckString,
						DeckClass:      &deckClass,
					},
					Player2: &proto.MatchPlayer{
						Address:        address2,
						InitDeckString: deckString,
						DeckClass:      &deckClass,
					},
					Info: &proto.MatchStartInfo{
						Player1GameMode: &mode,
						Player2GameMode: &mode,
					},
				})
				require.NoError(t, err)
				assert.NotZero(t, matchID)

				matchesByMode[mode] = matchID

				endedAt := startedAt.Add(duration)
				winningPlayerNum := uint(1)

				_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
					MatchID:           matchID,
					Status:            proto.MatchStatus_COMPLETED,
					Player1DeckString: deckString,
					Player2DeckString: deckString,
					EndedAt:           &endedAt,
					WinningPlayer:     &winningPlayerNum,
					TurnNonce:         20,
				})
				require.NoError(t, err)
			}
		}
	}

	ctx := apitest.AccountContext(accountID)

	t.Run("can get any type of match when the account is a player", func(t *testing.T) {
		for mode, matchID := range matchesByMode {
			match, err := apitest.Client().GetMatch(ctx, matchID)
			require.NoError(t, err)
			assert.NotNil(t, match)
			assert.Equal(t, matchID, match.ID)
			assert.Equal(t, mode.String(), match.Mode())
			assert.NotEmpty(t, match.ReplayID)
		}
	})

	t.Run("can get ranked and conquest match when the account is not a player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID3)
		modes := []proto.GameMode{proto.GameMode_RANKED_DISCOVERY, proto.GameMode_CONQUEST_DISCOVERY}

		for _, mode := range modes {
			matchID := matchesByMode[mode]

			match, err := apitest.Client().GetMatch(ctx, matchID)
			require.NoError(t, err)
			assert.NotNil(t, match)
			assert.Equal(t, matchID, match.ID)
			assert.Equal(t, mode.String(), match.Mode())
			assert.Empty(t, match.ReplayID)
		}
	})

	t.Run("cannot get private match when the account is not a player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID3)
		modes := []proto.GameMode{proto.GameMode_CHALLENGE_DISCOVERY}

		for _, mode := range modes {
			matchID := matchesByMode[mode]

			match, err := apitest.Client().GetMatch(ctx, matchID)
			require.ErrorContains(t, err, "match is private and you don't have the replay ID")
			assert.Nil(t, match)
		}
	})
}

func TestMatchHistoryArchive(t *testing.T) {
	var matchRecorder *rpcmock.MockMatchRecorder

	var matchID uint64

	var serviceContext context.Context

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchRecorder = rpcmock.NewMockMatchRecorder(ctrl)

			apiService := apitest.APIService()

			originalMatchRecorder := apiService.RPC.MatchRecorder

			apiService.RPC.MatchRecorder = matchRecorder

			t.Cleanup(func() {
				apiService.RPC.MatchRecorder = originalMatchRecorder
			})
		}

		// Auth token to communicate to the api as a service<>service
		serviceContext = apitest.ServiceContext()

		// Start match
		{
			// Run fixtures to give us some user data
			fixtures, err := apitest.GenFixtures()
			assert.NoError(t, err)

			gameMode := proto.GameMode_RANKED_DISCOVERY

			// Start a new match
			matchID, _, err = apitest.Client().InternalMatchStart(serviceContext, &proto.MatchStartRequest{
				Player1: &proto.MatchPlayer{
					Address:        fixtures.UserA.Address,
					InitDeckString: "SWxHRT",
				},
				Player2: &proto.MatchPlayer{
					Address:        fixtures.UserB.Address,
					InitDeckString: "SWxSTR",
				},
				Info: &proto.MatchStartInfo{
					Player1GameMode: &gameMode,
					Player2GameMode: &gameMode,
				},
			})
			assert.NoError(t, err)
			assert.NotZero(t, matchID)

			// Fetch the match from the service
			match, err := apitest.Client().GetMatch(serviceContext, matchID)
			assert.NoError(t, err)
			assert.NotNil(t, match)
		}
	}

	gameStateMock := []mockGameState{
		{Nonce: 1, Player1: "peter", Player2: "will", Move: "init"},
		{Nonce: 2, Player1: "peter", Player2: "will", Move: "will attacks peter"},
		{Nonce: 3, Player1: "peter", Player2: "will", Move: "peters health -1"},
	}

	gameStateData, err := json.Marshal(gameStateMock)
	assert.NoError(t, err)

	jsonStringData := string(gameStateData)

	if matchRecorder != nil {
		matchRecorder.EXPECT().UploadArchiveRecords(matchID, int64(0), jsonStringData)
		matchRecorder.EXPECT().ArchiveURI(matchID, int64(0)).Return("archive-uri")
	}

	ok, archiveURI, err := apitest.Client().InternalAppendMatchArchiveRecords(serviceContext, matchID, int64(0), jsonStringData)
	require.NoError(t, err)
	assert.True(t, ok)
	assert.Equal(t, "archive-uri", archiveURI)
}

func TestGetMatchArchiveRecordsURI(t *testing.T) {
	var matchRecorder *rpcmock.MockMatchRecorder

	var accountID, accountID2 proto.AccountID

	var address, address2 proto.Hash

	var matchesByMode map[proto.GameMode]struct {
		matchID  uint64
		replayID string
	}

	// Setup
	{
		var conquestStateManager *rpcmock.MockConquestStateManager

		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestStateManager = rpcmock.NewMockConquestStateManager(ctrl)
			conquestStateManager.EXPECT().UpdateProgress(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes() // Called when conquest matches end

			conquestV2PointsUpdater := rpcmock.NewMockConquestV2PointsUpdater(ctrl)
			conquestV2PointsUpdater.EXPECT().Update(gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes() // Called when conquest matches end

			matchRecorder = rpcmock.NewMockMatchRecorder(ctrl)

			apiService := apitest.APIService()

			originalConquestStateManager := apiService.RPC.ConquestStateManager
			originalConquestV2PointsUpdater := apiService.RPC.ConquestV2PointsUpdater
			originalMatchRecorder := apiService.RPC.MatchRecorder

			apiService.RPC.ConquestStateManager = conquestStateManager
			apiService.RPC.ConquestV2PointsUpdater = conquestV2PointsUpdater
			apiService.RPC.MatchRecorder = matchRecorder

			t.Cleanup(func() {
				apiService.RPC.ConquestStateManager = originalConquestStateManager
				apiService.RPC.ConquestV2PointsUpdater = originalConquestV2PointsUpdater
				apiService.RPC.MatchRecorder = originalMatchRecorder
			})
		}

		// Create accounts
		{
			var err error
			accountID, address, err = apitest.CreateRandomAccount("TestGetMatchArchiveRecordsURI-1")
			require.NoError(t, err)
			accountID2, address2, err = apitest.CreateRandomAccount("TestGetMatchArchiveRecordsURI-2")
			require.NoError(t, err)
		}

		{
			var err error
			err = setMinimumLevelForRanked(accountID)
			require.NoError(t, err)

			err = setMinimumLevelForRanked(accountID2)
			require.NoError(t, err)
		}

		// Create conquests
		{
			createConquest(t, accountID, proto.GameMode_CONQUEST_DISCOVERY, proto.ConquestStatus_IN_PROGRESS, 1, nil)
			createConquest(t, accountID2, proto.GameMode_CONQUEST_DISCOVERY, proto.ConquestStatus_IN_PROGRESS, 1, nil)

			t.Cleanup(func() {
				err := data.DB.Conquests().Find(db.Cond{"account_id": db.In(accountID, accountID2)}).Delete()
				require.NoError(t, err)
			})
		}

		// Create matches
		{
			matchesByMode = map[proto.GameMode]struct {
				matchID  uint64
				replayID string
			}{
				proto.GameMode_RANKED_DISCOVERY:    {},
				proto.GameMode_CONQUEST_DISCOVERY:  {},
				proto.GameMode_CHALLENGE_DISCOVERY: {},
			}

			deckClass := proto.DeckClass_STR
			deckString := "SWxSTR"
			startedAt := time.Now()

			// play several matches to have test data
			for mode := range matchesByMode {
				duration := time.Second * 100

				matchID, replayID, err := apitest.Client().InternalMatchStart(apitest.ServiceContext(), &proto.MatchStartRequest{
					Player1: &proto.MatchPlayer{
						Address:        address,
						InitDeckString: deckString,
						DeckClass:      &deckClass,
					},
					Player2: &proto.MatchPlayer{
						Address:        address2,
						InitDeckString: deckString,
						DeckClass:      &deckClass,
					},
					Info: &proto.MatchStartInfo{
						Player1GameMode: &mode,
						Player2GameMode: &mode,
					},
				})
				require.NoError(t, err)
				assert.NotZero(t, matchID)
				assert.NotEmpty(t, replayID)

				matchesByMode[mode] = struct {
					matchID  uint64
					replayID string
				}{matchID: matchID, replayID: replayID}

				endedAt := startedAt.Add(duration)
				winningPlayerNum := uint(1)

				_, err = apitest.Client().InternalMatchEnd(apitest.ServiceContext(), &proto.MatchEndRequest{
					MatchID:           matchID,
					Status:            proto.MatchStatus_COMPLETED,
					Player1DeckString: deckString,
					Player2DeckString: deckString,
					EndedAt:           &endedAt,
					WinningPlayer:     &winningPlayerNum,
					TurnNonce:         20,
				})
				require.NoError(t, err)
			}
		}
	}

	t.Run("public", func(t *testing.T) {
		ctx := context.Background()

		t.Run("can get any type of match with a valid replay ID", func(t *testing.T) {
			for mode, matchInfo := range matchesByMode {
				matchRecorder.EXPECT().GetSignedRecordsURLs(matchInfo.matchID, 120*time.Minute).Return(
					[]string{
						"index-uri",
						"uri-1",
						"uri-2",
					},
					nil,
				)

				ok, match, archiveIndexURI, recordURIs, err := apitest.Client().GetMatchArchiveRecordsURI(ctx, matchInfo.matchID, matchInfo.replayID)
				require.NoError(t, err)
				assert.True(t, ok)
				assert.NotNil(t, match)
				assert.Equal(t, matchInfo.matchID, match.ID)
				assert.Equal(t, mode.String(), match.Mode())
				assert.Equal(t, matchInfo.replayID, match.ReplayID)
				assert.Equal(t, "index-uri", archiveIndexURI)
				assert.Equal(t, []string{"uri-1", "uri-2"}, recordURIs)
			}
		})

		t.Run("cannot get any type of match without a valid replay ID", func(t *testing.T) {
			for _, matchInfo := range matchesByMode {
				ok, match, archiveIndexURI, recordURIs, err := apitest.Client().GetMatchArchiveRecordsURI(ctx, matchInfo.matchID, "")
				require.ErrorContains(t, err, "match with this replay ID not found")
				assert.False(t, ok)
				assert.Nil(t, match)
				assert.Empty(t, archiveIndexURI)
				assert.Empty(t, recordURIs)
			}
		})
	})

	t.Run("user", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		t.Run("can get any type of match with a valid replay ID", func(t *testing.T) {
			for mode, matchInfo := range matchesByMode {
				matchRecorder.EXPECT().GetSignedRecordsURLs(matchInfo.matchID, 120*time.Minute).Return(
					[]string{
						"index-uri",
						"uri-1",
						"uri-2",
					},
					nil,
				)

				ok, match, archiveIndexURI, recordURIs, err := apitest.Client().GetMatchArchiveRecordsURI(ctx, matchInfo.matchID, matchInfo.replayID)
				require.NoError(t, err)
				assert.True(t, ok)
				assert.NotNil(t, match)
				assert.Equal(t, matchInfo.matchID, match.ID)
				assert.Equal(t, mode.String(), match.Mode())
				assert.Equal(t, matchInfo.replayID, match.ReplayID)
				assert.Equal(t, "index-uri", archiveIndexURI)
				assert.Equal(t, []string{"uri-1", "uri-2"}, recordURIs)
			}
		})

		t.Run("cannot get any type of match without a valid replay ID", func(t *testing.T) {
			for _, matchInfo := range matchesByMode {
				ok, match, archiveIndexURI, recordURIs, err := apitest.Client().GetMatchArchiveRecordsURI(ctx, matchInfo.matchID, "")
				require.ErrorContains(t, err, "match with this replay ID not found")
				assert.False(t, ok)
				assert.Nil(t, match)
				assert.Empty(t, archiveIndexURI)
				assert.Empty(t, recordURIs)
			}
		})
	})
}

// mockGameState is just a helper to create some fake game-state
// looking data. This is not the real data structure but from the perspective
// of our logger it doesn't matter.
type mockGameState struct {
	Nonce   int    `json:"nonce"`
	Player1 string `json:"player1"`
	Player2 string `json:"player2"`
	Move    string `json:"move"`
}

func setMinimumLevelForRanked(accountID proto.AccountID) error {
	player, err := data.DB.Accounts(nil).FindByID(accountID)
	if err != nil {
		return err
	}

	player.Level = playerRank.MinimumLevelForRanked

	err = data.DB.Save(player)
	if err != nil {
		return err
	}

	return nil
}
