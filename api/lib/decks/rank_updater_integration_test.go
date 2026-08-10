//go:build integration

package decks_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/decks"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestSyncRankUpdater(t *testing.T) {
	var accountTraineeID, accountApprenticeID, accountMasterID proto.AccountID

	var deckString1, deckString2 string

	season := data.CurrentSeason()
	gameMode := proto.GameMode_RANKED_CONSTRUCTED

	// Setup
	{
		// Accounts
		{
			var err error

			accountTraineeID, _, err = apitest.CreateRandomAccount("TestSyncRankUpdater-trainee")
			require.NoError(t, err)

			accountApprenticeID, _, err = apitest.CreateRandomAccount("TestSyncRankUpdater-apprentice")
			require.NoError(t, err)

			accountMasterID, _, err = apitest.CreateRandomAccount("TestSyncRankUpdater-master")
			require.NoError(t, err)
		}

		// Account stats
		{
			stat, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountTraineeID, gameMode, season)
			require.NoError(t, err)

			stat.PlayerRank = proto.PlayerRank_TRAINEE

			err = data.DB.Save(stat)
			require.NoError(t, err)

			stat, err = data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountApprenticeID, gameMode, season)
			require.NoError(t, err)

			stat.PlayerRank = proto.PlayerRank_APPRENTICE

			err = data.DB.Save(stat)
			require.NoError(t, err)

			stat, err = data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountMasterID, gameMode, season)
			require.NoError(t, err)

			stat.PlayerRank = proto.PlayerRank_MASTER

			err = data.DB.Save(stat)
			require.NoError(t, err)
		}

		// Decks
		{
			var err error

			decks := data.GetStarterDecks()

			deckString1, err = data.EncodeDeckString(decks[0].CardIDs, decks[0].Class)
			require.NoError(t, err)

			deckString2, err = data.EncodeDeckString(decks[1].CardIDs, decks[1].Class)
			require.NoError(t, err)
		}
	}

	updater := decks.NewSyncRankUpdater()

	t.Run("update from match", func(t *testing.T) {
		t.Run("does nothing when the game mode is not ranked constructed", func(t *testing.T) {
			winner := uint(0)
			err := updater.UpdateFromMatch(data.DB, &data.Match{Match: &proto.Match{
				Player1ID:         accountTraineeID,
				Player1GameMode:   proto.GameMode_CONQUEST_CONSTRUCTED,
				Player1DeckString: deckString1,
				Player2ID:         accountApprenticeID,
				Player2GameMode:   proto.GameMode_CONQUEST_CONSTRUCTED,
				Player2DeckString: deckString2,
				WinningPlayer:     &winner,
				Status:            proto.MatchStatus_COMPLETED,
			}}, season)
			require.NoError(t, err)

			deckRank, err := data.DB.DeckRanks().FindCurrentStatsByDeckstring(deckString1)
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, deckRank)

			deckRank, err = data.DB.DeckRanks().FindCurrentStatsByDeckstring(deckString2)
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, deckRank)
		})

		t.Run("fails when the winner is not set", func(t *testing.T) {
			err := updater.UpdateFromMatch(data.DB, &data.Match{Match: &proto.Match{
				Player1ID:         accountTraineeID,
				Player1GameMode:   gameMode,
				Player1DeckString: deckString1,
				Player2ID:         accountApprenticeID,
				Player2GameMode:   gameMode,
				Player2DeckString: deckString2,
				Status:            proto.MatchStatus_COMPLETED,
			}}, season)
			require.ErrorContains(t, err, "winning player cannot be nil")
		})

		t.Run("does not get updated but creates a record if does not exist when player's rank is lower than apprentice", func(t *testing.T) {
			// Setup
			{
				t.Cleanup(func() {
					err := data.DB.DeckRanks().Truncate()
					require.NoError(t, err)
				})
			}

			winner := uint(0)
			err := updater.UpdateFromMatch(data.DB, &data.Match{Match: &proto.Match{
				Player1ID:         accountTraineeID,
				Player1GameMode:   gameMode,
				Player1DeckString: deckString1,
				Player2ID:         accountApprenticeID,
				Player2GameMode:   gameMode,
				Player2DeckString: deckString2,
				WinningPlayer:     &winner,
				Status:            proto.MatchStatus_COMPLETED,
			}}, season)
			require.NoError(t, err)

			deckRank, err := data.DB.DeckRanks().FindCurrentStatsByDeckstring(deckString1)
			require.NoError(t, err)
			require.NotNil(t, deckRank)
			assert.Equal(t, 0, int(deckRank.TieCount))

			deckRank, err = data.DB.DeckRanks().FindCurrentStatsByDeckstring(deckString2)
			require.NoError(t, err)
			require.NotNil(t, deckRank)
			assert.Equal(t, 1, int(deckRank.TieCount))
		})

		t.Run("loser deck gets match status counter up when match is not completed", func(t *testing.T) {
			tests := []struct {
				matchStatus                  proto.MatchStatus
				expectedWinnerAbandonCounter int
				expectedLoserAbandonCounter  int
				expectedWinnerForfeitCounter int
				expectedLoserForfeitCounter  int
			}{
				{
					matchStatus:                  proto.MatchStatus_ABANDONED,
					expectedWinnerAbandonCounter: 0,
					expectedLoserAbandonCounter:  1,
				},
				{
					matchStatus:                  proto.MatchStatus_FORFEITED,
					expectedWinnerForfeitCounter: 0,
					expectedLoserForfeitCounter:  1,
				},
			}

			for _, tt := range tests {
				t.Run(fmt.Sprintf("for %s", tt.matchStatus), func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.DeckRanks().Truncate()
							require.NoError(t, err)
						})
					}

					winner := uint(1)
					err := updater.UpdateFromMatch(data.DB, &data.Match{Match: &proto.Match{
						Player1ID:         accountMasterID,
						Player1GameMode:   gameMode,
						Player1DeckString: deckString1,
						Player2ID:         accountApprenticeID,
						Player2GameMode:   gameMode,
						Player2DeckString: deckString2,
						WinningPlayer:     &winner,
						Status:            tt.matchStatus,
					}}, season)
					require.NoError(t, err)

					deckRank, err := data.DB.DeckRanks().FindCurrentStatsByDeckstring(deckString1)
					require.NoError(t, err)
					require.NotNil(t, deckRank)
					assert.Equal(t, tt.expectedWinnerAbandonCounter, int(deckRank.AbandonCount))
					assert.Equal(t, tt.expectedWinnerForfeitCounter, int(deckRank.ForfeitCount))

					deckRank, err = data.DB.DeckRanks().FindCurrentStatsByDeckstring(deckString2)
					require.NoError(t, err)
					require.NotNil(t, deckRank)
					assert.Equal(t, tt.expectedLoserAbandonCounter, int(deckRank.AbandonCount))
					assert.Equal(t, tt.expectedLoserForfeitCounter, int(deckRank.ForfeitCount))
				})
			}
		})

		t.Run("updates match result", func(t *testing.T) {
			tests := []struct {
				winnerPlayer                 uint
				expectedPlayer1DeckWinCount  int
				expectedPlayer1DeckTieCount  int
				expectedPlayer1DeckLossCount int
				expectedPlayer2DeckWinCount  int
				expectedPlayer2DeckTieCount  int
				expectedPlayer2DeckLossCount int
			}{
				{
					winnerPlayer:                 1,
					expectedPlayer1DeckWinCount:  1,
					expectedPlayer2DeckLossCount: 1,
				},
				{
					winnerPlayer:                 0,
					expectedPlayer1DeckWinCount:  1,
					expectedPlayer1DeckTieCount:  1,
					expectedPlayer2DeckTieCount:  1,
					expectedPlayer2DeckLossCount: 1,
				},
				{
					winnerPlayer:                 2,
					expectedPlayer1DeckWinCount:  1,
					expectedPlayer1DeckTieCount:  1,
					expectedPlayer1DeckLossCount: 1,
					expectedPlayer2DeckWinCount:  1,
					expectedPlayer2DeckTieCount:  1,
					expectedPlayer2DeckLossCount: 1,
				},
			}

			for i := 0; i < len(tests); i++ {
				tt := tests[i]

				t.Run(fmt.Sprintf("when winning player is %d", tt.winnerPlayer), func(t *testing.T) {
					err := updater.UpdateFromMatch(data.DB, &data.Match{Match: &proto.Match{
						Player1ID:         accountMasterID,
						Player1GameMode:   gameMode,
						Player1DeckString: deckString1,
						Player2ID:         accountApprenticeID,
						Player2GameMode:   gameMode,
						Player2DeckString: deckString2,
						WinningPlayer:     &tt.winnerPlayer,
						Status:            proto.MatchStatus_COMPLETED,
					}}, season)
					require.NoError(t, err)

					deckRank, err := data.DB.DeckRanks().FindCurrentStatsByDeckstring(deckString1)
					require.NoError(t, err)
					require.NotNil(t, deckRank)
					assert.Equal(t, tt.expectedPlayer1DeckWinCount, int(deckRank.WinCount))
					assert.Equal(t, tt.expectedPlayer1DeckTieCount, int(deckRank.TieCount))
					assert.Equal(t, tt.expectedPlayer1DeckLossCount, int(deckRank.LossCount))

					deckRank, err = data.DB.DeckRanks().FindCurrentStatsByDeckstring(deckString2)
					require.NoError(t, err)
					require.NotNil(t, deckRank)
					assert.Equal(t, tt.expectedPlayer2DeckWinCount, int(deckRank.WinCount))
					assert.Equal(t, tt.expectedPlayer2DeckTieCount, int(deckRank.TieCount))
					assert.Equal(t, tt.expectedPlayer2DeckLossCount, int(deckRank.LossCount))
				})
			}
		})
	})
}

func TestAsyncRankUpdater(t *testing.T) {
	season := data.CurrentSeason()
	gameMode := proto.GameMode_RANKED_CONSTRUCTED

	updater := decks.NewAsyncRankUpdater()

	t.Run("update from match", func(t *testing.T) {
		t.Run("does nothing when the match is nil", func(t *testing.T) {
			err := updater.UpdateFromMatch(data.DB, nil, season)
			require.NoError(t, err)
		})

		t.Run("does nothing when the match has 0 ID", func(t *testing.T) {
			err := updater.UpdateFromMatch(data.DB, &data.Match{Match: &proto.Match{ID: 0}}, season)
			require.NoError(t, err)
		})

		t.Run("does nothing when the game mode is not ranked constructed", func(t *testing.T) {
			err := updater.UpdateFromMatch(data.DB, &data.Match{Match: &proto.Match{
				ID:              1,
				Player1GameMode: proto.GameMode_CONQUEST_CONSTRUCTED,
				Player2GameMode: proto.GameMode_CONQUEST_CONSTRUCTED,
			}}, season)
			require.NoError(t, err)
		})

		t.Run("schedules task for updating deck ranks", func(t *testing.T) {
			matchID := uint64(10)

			err := updater.UpdateFromMatch(data.DB, &data.Match{Match: &proto.Match{
				ID:              matchID,
				Player1GameMode: gameMode,
				Player2GameMode: gameMode,
			}}, season)
			require.NoError(t, err)

			_, payload, err := apitest.GetTask[jobqueue.DeckRankUpdateTask](jobqueue.DeckRankUpdateWorkGroup, nil)
			require.NoError(t, err)
			require.NotNil(t, payload)
			assert.Equal(t, matchID, payload.MatchID)
			assert.Equal(t, season, payload.Season)
		})
	})
}
