//go:build integration

package conquestv2_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestPointsUpdater(t *testing.T) {
	ctx := apitest.DBContext(context.Background())

	sess := data.DB.Session

	var treasureCalculator *mock.MockTreasureCalculator

	var pointsCalculator *mock.MockPointsCalculator

	var analyticsTracker *analyticsMock.MockTracker

	var accountID1, accountID2 proto.AccountID

	var player1DeckString, player2DeckString string

	// Setup
	{
		// Accounts
		{
			var err error

			accountID1, _, err = apitest.CreateRandomAccount("TestPointsUpdater1")
			require.NoError(t, err)

			accountID2, _, err = apitest.CreateRandomAccount("TestPointsUpdater2")
			require.NoError(t, err)
		}

		// Decks
		{
			// Player 1
			{
				err := data.CreateStarterDecks(data.DB, accountID1)
				require.NoError(t, err)

				deck, err := data.DB.Decks().FindOne(db.Cond{"account_id": accountID1, "deck_type": proto.DeckType_UNLOCKED_STARTER})
				require.NoError(t, err)

				player1DeckString = deck.DeckString
			}

			// Player 2
			{
				err := data.CreateStarterDecks(data.DB, accountID2)
				require.NoError(t, err)

				deck, err := data.DB.Decks().FindOne(db.Cond{"account_id": accountID2, "deck_type": proto.DeckType_UNLOCKED_STARTER})
				require.NoError(t, err)

				player2DeckString = deck.DeckString
			}
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			treasureCalculator = mock.NewMockTreasureCalculator(ctrl)
			pointsCalculator = mock.NewMockPointsCalculator(ctrl)
			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
		}
	}

	startedAt := time.Now()
	endedAt := startedAt.Add(time.Minute)

	updater := conquestv2.NewPointsUpdater(treasureCalculator, pointsCalculator, analyticsTracker)

	t.Run("no points earned when the match is not a conquest", func(t *testing.T) {
		modes := []proto.GameMode{
			proto.GameMode_TUTORIAL,
			proto.GameMode_PRACTICE_BOT,
			proto.GameMode_WARM_UP,
			proto.GameMode_RANKED_CONSTRUCTED,
			proto.GameMode_RANKED_DISCOVERY,
			proto.GameMode_CHALLENGE_CONSTRUCTED,
			proto.GameMode_CHALLENGE_DISCOVERY,
		}

		for _, mode := range modes {
			match := &data.Match{
				Match: &proto.Match{
					Status:                proto.MatchStatus_COMPLETED,
					Player1GameMode:       mode,
					Player2GameMode:       mode,
					Player1ID:             accountID1,
					Player2ID:             accountID2,
					Player1DeckString:     player1DeckString,
					Player2DeckString:     player2DeckString,
					InitPlayer1DeckString: player1DeckString,
					InitPlayer2DeckString: player2DeckString,
					WinningPlayer:         data.SetUIntPointer(0),
					TurnNonce:             4,
					StartedAt:             &startedAt,
					EndedAt:               &endedAt,
				},
			}

			err := match.Validate()
			require.NoError(t, err)

			events, rewards, err := updater.Update(ctx, sess, match)
			require.NoError(t, err)
			assert.Nil(t, events)
			assert.Nil(t, rewards)
		}

	})

	t.Run("no points earned when the match is a draw", func(t *testing.T) {
		match := &data.Match{
			Match: &proto.Match{
				Status:                proto.MatchStatus_COMPLETED,
				Player1GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
				Player2GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
				Player1ID:             accountID1,
				Player2ID:             accountID2,
				Player1DeckString:     player1DeckString,
				Player2DeckString:     player2DeckString,
				InitPlayer1DeckString: player1DeckString,
				InitPlayer2DeckString: player2DeckString,
				WinningPlayer:         data.SetUIntPointer(0),
				TurnNonce:             4,
				StartedAt:             &startedAt,
				EndedAt:               &endedAt,
			},
		}

		err := match.Validate()
		require.NoError(t, err)

		events, rewards, err := updater.Update(ctx, sess, match)
		require.NoError(t, err)
		assert.Nil(t, events)
		assert.Nil(t, rewards)
	})

	t.Run("cannot earn points above the total required points for level 10", func(t *testing.T) {
		var existingPointsPlayer2 *data.ConquestPoints

		// Setup existing conquest points for player 2
		{
			var err error

			existingPointsPlayer2, err = data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID2, 2)
			require.NoError(t, err)

			existingPointsPlayer2.CurrentPoints = 13740
			existingPointsPlayer2.TotalPoints = 13740

			err = data.DB.Save(existingPointsPlayer2)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.ConquestPoints(nil).Find(db.Cond{"event_id": 2}).Delete()
				require.NoError(t, err)
			})
		}

		match := &data.Match{
			Match: &proto.Match{
				Status:                proto.MatchStatus_COMPLETED,
				Player1GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
				Player2GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
				Player1ID:             accountID1,
				Player2ID:             accountID2,
				Player1DeckString:     player1DeckString,
				Player2DeckString:     player2DeckString,
				InitPlayer1DeckString: player1DeckString,
				InitPlayer2DeckString: player2DeckString,
				WinningPlayer:         data.SetUIntPointer(1),
				TurnNonce:             4,
				StartedAt:             &startedAt,
				EndedAt:               &endedAt,
			},
		}

		earnedPointsPlayer1 := uint64(11)
		earnedPointsPlayer2 := uint64(12)

		expectedCurrentPointsPlayer2 := 13750
		expectedTotalPointsPlayer2 := 13750

		treasureLevelPlayer2 := uint16(10)
		treasurePointsPlayer2 := uint64(0)
		treasurePointsRequiredPlayer2 := uint64(0)

		err := match.Validate()
		require.NoError(t, err)

		// Mocks
		{
			pointsCalculator.EXPECT().FromDeckString(ctx, accountID1, player1DeckString).Return(earnedPointsPlayer1, nil)
			pointsCalculator.EXPECT().FromDeckString(ctx, accountID2, player2DeckString).Return(earnedPointsPlayer2, nil)

			treasureCalculator.EXPECT().
				FromConquestPoints(gomock.Any()).
				Return(&data.ConquestV2TreasureProgress{
					ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{},
				}, nil)
			treasureCalculator.EXPECT().
				FromConquestPoints(gomock.Any()).
				Return(&data.ConquestV2TreasureProgress{
					ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{},
				}, nil)
			treasureCalculator.EXPECT().
				FromConquestPoints(gomock.Any()).
				DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
					assert.Equal(t, 13740, int(conquestPoints.CurrentPoints))
					assert.Equal(t, 13740, int(conquestPoints.TotalPoints))

					return &data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          treasureLevelPlayer2,
							TreasurePoints:         treasurePointsPlayer2,
							TreasurePointsRequired: treasurePointsRequiredPlayer2,
						},
					}, nil
				})
			treasureCalculator.EXPECT().
				FromConquestPoints(gomock.Any()).
				DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
					assert.Equal(t, 13750, int(conquestPoints.CurrentPoints))
					assert.Equal(t, 13750, int(conquestPoints.TotalPoints))

					return &data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          treasureLevelPlayer2,
							TreasurePoints:         treasurePointsPlayer2,
							TreasurePointsRequired: treasurePointsRequiredPlayer2,
						},
					}, nil
				})

			pointsCalculator.EXPECT().DetailedFromDeckString(ctx, accountID1, player1DeckString).Return(&conquestv2.DetailedPoints{1, 2, 3, 4}, nil)
			pointsCalculator.EXPECT().DetailedFromDeckString(ctx, accountID2, player2DeckString).Return(&conquestv2.DetailedPoints{5, 6, 7, 8}, nil)

			analyticsTracker.EXPECT().TrackConquestPointsAwarded(gomock.Any(), gomock.Any(), gomock.Any(), uint64(1), uint64(2), uint64(3), uint64(4))
			analyticsTracker.EXPECT().TrackConquestPointsAwarded(gomock.Any(), gomock.Any(), gomock.Any(), uint64(5), uint64(6), uint64(7), uint64(8))
		}

		events, rewards, err := updater.Update(ctx, sess, match)
		require.NoError(t, err)
		assert.Nil(t, events)

		require.Len(t, rewards, 2)
		for _, reward := range rewards {
			if reward.AccountID == accountID2 {
				assert.Equal(t, proto.RewardType_CONQUEST_POINTS, reward.Type)
				assert.NotNil(t, reward.ConquestV2TreasureProgress)
				treasureProgress := reward.ConquestV2TreasureProgress
				assert.Equal(t, int(treasureLevelPlayer2), int(treasureProgress.BeforeMatch.TreasureLevel))
				assert.Equal(t, int(treasurePointsPlayer2), int(treasureProgress.BeforeMatch.TreasurePoints))
				assert.Equal(t, int(treasurePointsRequiredPlayer2), int(treasureProgress.BeforeMatch.TreasurePointsRequired))
				assert.Equal(t, int(treasureLevelPlayer2), int(treasureProgress.AfterMatch.TreasureLevel))
				assert.Equal(t, int(treasurePointsPlayer2), int(treasureProgress.AfterMatch.TreasurePoints))
				assert.Equal(t, int(treasurePointsRequiredPlayer2), int(treasureProgress.AfterMatch.TreasurePointsRequired))
			}
		}

		// Database check
		conquestPoints2, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID2, 2)
		require.NoError(t, err)
		assert.Equal(t, expectedCurrentPointsPlayer2, int(conquestPoints2.CurrentPoints))
		assert.Equal(t, expectedTotalPointsPlayer2, int(conquestPoints2.TotalPoints))
	})

	t.Run("earns points for a completed match", func(t *testing.T) {
		var existingPointsPlayer2 *data.ConquestPoints

		// Setup existing conquest points for player 2
		{
			var err error

			existingPointsPlayer2, err = data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID2, 2)
			require.NoError(t, err)

			existingPointsPlayer2.CurrentPoints = 10
			existingPointsPlayer2.TotalPoints = 20

			err = data.DB.Save(existingPointsPlayer2)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.ConquestPoints(nil).Find(db.Cond{"event_id": 2}).Delete()
				require.NoError(t, err)
			})
		}

		match := &data.Match{
			Match: &proto.Match{
				Status:                proto.MatchStatus_COMPLETED,
				Player1GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
				Player2GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
				Player1ID:             accountID1,
				Player2ID:             accountID2,
				Player1DeckString:     player1DeckString,
				Player2DeckString:     player2DeckString,
				InitPlayer1DeckString: player1DeckString,
				InitPlayer2DeckString: player2DeckString,
				WinningPlayer:         data.SetUIntPointer(1),
				TurnNonce:             4,
				StartedAt:             &startedAt,
				EndedAt:               &endedAt,
			},
		}

		earnedPointsPlayer1 := uint64(11)
		earnedPointsPlayer2 := uint64(12)

		expectedCurrentPointsPlayer1 := int(earnedPointsPlayer1)
		expectedTotalPointsPlayer1 := int(earnedPointsPlayer1)
		expectedCurrentPointsPlayer2 := int(earnedPointsPlayer2) + int(existingPointsPlayer2.CurrentPoints)
		expectedTotalPointsPlayer2 := int(earnedPointsPlayer2) + int(existingPointsPlayer2.TotalPoints)

		treasureLevelPlayer1 := uint16(1)
		treasurePointsPlayer1 := uint64(2)
		treasurePointsRequiredPlayer1 := uint64(3)

		treasureLevelPlayer2 := uint16(4)
		treasurePointsPlayer2 := uint64(5)
		treasurePointsRequiredPlayer2 := uint64(6)

		err := match.Validate()
		require.NoError(t, err)

		// Mocks
		{
			pointsCalculator.EXPECT().FromDeckString(ctx, accountID1, player1DeckString).Return(earnedPointsPlayer1, nil)
			pointsCalculator.EXPECT().FromDeckString(ctx, accountID2, player2DeckString).Return(earnedPointsPlayer2, nil)

			treasureCalculator.EXPECT().
				FromConquestPoints(gomock.Any()).
				DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
					assert.Equal(t, 0, int(conquestPoints.CurrentPoints))
					assert.Equal(t, 0, int(conquestPoints.TotalPoints))

					return &data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          0,
							TreasurePoints:         0,
							TreasurePointsRequired: 250,
						},
					}, nil
				})
			treasureCalculator.EXPECT().
				FromConquestPoints(gomock.Any()).
				DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
					assert.Equal(t, int(earnedPointsPlayer1), int(conquestPoints.CurrentPoints))
					assert.Equal(t, int(earnedPointsPlayer1), int(conquestPoints.TotalPoints))

					return &data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          treasureLevelPlayer1,
							TreasurePoints:         treasurePointsPlayer1,
							TreasurePointsRequired: treasurePointsRequiredPlayer1,
						},
					}, nil
				})
			treasureCalculator.EXPECT().
				FromConquestPoints(gomock.Any()).
				DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
					assert.Equal(t, 10, int(conquestPoints.CurrentPoints))
					assert.Equal(t, 20, int(conquestPoints.TotalPoints))

					return &data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          0,
							TreasurePoints:         10,
							TreasurePointsRequired: 240,
						},
					}, nil

				})
			treasureCalculator.EXPECT().
				FromConquestPoints(gomock.Any()).
				DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
					assert.Equal(t, 10+int(earnedPointsPlayer2), int(conquestPoints.CurrentPoints))
					assert.Equal(t, 20+int(earnedPointsPlayer2), int(conquestPoints.TotalPoints))

					return &data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          treasureLevelPlayer2,
							TreasurePoints:         treasurePointsPlayer2,
							TreasurePointsRequired: treasurePointsRequiredPlayer2,
						},
					}, nil
				})

			pointsCalculator.EXPECT().DetailedFromDeckString(ctx, accountID1, player1DeckString).Return(&conquestv2.DetailedPoints{1, 2, 3, 4}, nil)
			pointsCalculator.EXPECT().DetailedFromDeckString(ctx, accountID2, player2DeckString).Return(&conquestv2.DetailedPoints{5, 6, 7, 8}, nil)

			analyticsTracker.EXPECT().TrackConquestPointsAwarded(gomock.Any(), gomock.Any(), gomock.Any(), uint64(1), uint64(2), uint64(3), uint64(4))
			analyticsTracker.EXPECT().TrackConquestPointsAwarded(gomock.Any(), gomock.Any(), gomock.Any(), uint64(5), uint64(6), uint64(7), uint64(8))
		}

		events, rewards, err := updater.Update(ctx, sess, match)
		require.NoError(t, err)
		assert.Nil(t, events)

		require.Len(t, rewards, 2)
		for _, reward := range rewards {
			if reward.AccountID == accountID1 {
				assert.Equal(t, proto.RewardType_CONQUEST_POINTS, reward.Type)
				assert.NotNil(t, reward.ConquestV2TreasureProgress)
				treasureProgress := reward.ConquestV2TreasureProgress
				assert.Equal(t, 0, int(treasureProgress.BeforeMatch.TreasureLevel))
				assert.Equal(t, 0, int(treasureProgress.BeforeMatch.TreasurePoints))
				assert.Equal(t, 250, int(treasureProgress.BeforeMatch.TreasurePointsRequired))
				assert.Equal(t, treasureLevelPlayer1, treasureProgress.AfterMatch.TreasureLevel)
				assert.Equal(t, treasurePointsPlayer1, treasureProgress.AfterMatch.TreasurePoints)
				assert.Equal(t, treasurePointsRequiredPlayer1, treasureProgress.AfterMatch.TreasurePointsRequired)
			} else {
				assert.Equal(t, proto.RewardType_CONQUEST_POINTS, reward.Type)
				assert.NotNil(t, reward.ConquestV2TreasureProgress)
				treasureProgress := reward.ConquestV2TreasureProgress
				assert.Equal(t, 0, int(treasureProgress.BeforeMatch.TreasureLevel))
				assert.Equal(t, 10, int(treasureProgress.BeforeMatch.TreasurePoints))
				assert.Equal(t, 240, int(treasureProgress.BeforeMatch.TreasurePointsRequired))
				assert.Equal(t, treasureLevelPlayer2, treasureProgress.AfterMatch.TreasureLevel)
				assert.Equal(t, treasurePointsPlayer2, treasureProgress.AfterMatch.TreasurePoints)
				assert.Equal(t, treasurePointsRequiredPlayer2, treasureProgress.AfterMatch.TreasurePointsRequired)
			}
		}

		// Database check
		conquestPoints1, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID1, 2)
		require.NoError(t, err)
		assert.Equal(t, expectedCurrentPointsPlayer1, int(conquestPoints1.CurrentPoints))
		assert.Equal(t, expectedTotalPointsPlayer1, int(conquestPoints1.TotalPoints))

		conquestPoints2, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID2, 2)
		require.NoError(t, err)
		assert.Equal(t, expectedCurrentPointsPlayer2, int(conquestPoints2.CurrentPoints))
		assert.Equal(t, expectedTotalPointsPlayer2, int(conquestPoints2.TotalPoints))
	})

	t.Run("only a winner earns points when the match is forfeited or abandoned and within 3 turns", func(t *testing.T) {
		tests := []struct {
			winningPlayer uint
			winnerID      proto.AccountID
			loserID       proto.AccountID
			status        proto.MatchStatus
		}{
			{
				winningPlayer: 1,
				winnerID:      accountID1,
				loserID:       accountID2,
				status:        proto.MatchStatus_FORFEITED,
			},
			{
				winningPlayer: 2,
				winnerID:      accountID2,
				loserID:       accountID1,
				status:        proto.MatchStatus_FORFEITED,
			},
			{
				winningPlayer: 1,
				winnerID:      accountID1,
				loserID:       accountID2,
				status:        proto.MatchStatus_ABANDONED,
			},
			{
				winningPlayer: 2,
				winnerID:      accountID2,
				loserID:       accountID1,
				status:        proto.MatchStatus_ABANDONED,
			},
		}

		for _, tt := range tests {
			match := &data.Match{
				Match: &proto.Match{
					Status:                tt.status,
					Player1GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
					Player2GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
					Player1ID:             accountID1,
					Player2ID:             accountID2,
					Player1DeckString:     player1DeckString,
					Player2DeckString:     player2DeckString,
					InitPlayer1DeckString: player1DeckString,
					InitPlayer2DeckString: player2DeckString,
					WinningPlayer:         &tt.winningPlayer,
					TurnNonce:             7,
					StartedAt:             &startedAt,
					EndedAt:               &endedAt,
				},
			}

			earnedPoints := uint64(11)

			expectedCurrentPoints := int(earnedPoints)
			expectedTotalPoints := int(earnedPoints)

			treasureLevel := uint16(1)
			treasurePoints := uint64(2)
			treasurePointsRequired := uint64(3)

			err := match.Validate()
			require.NoError(t, err)

			// Mocks
			{
				pointsCalculator.EXPECT().FromDeckString(ctx, gomock.Any(), gomock.Any()).Return(earnedPoints, nil)

				treasureCalculator.EXPECT().
					FromConquestPoints(gomock.Any()).
					Return(&data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          0,
							TreasurePoints:         0,
							TreasurePointsRequired: 250,
						}}, nil)
				treasureCalculator.EXPECT().
					FromConquestPoints(gomock.Any()).
					Return(&data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          treasureLevel,
							TreasurePoints:         treasurePoints,
							TreasurePointsRequired: treasurePointsRequired,
						}}, nil)

				pointsCalculator.EXPECT().DetailedFromDeckString(gomock.Any(), gomock.Any(), gomock.Any()).Return(&conquestv2.DetailedPoints{1, 2, 3, 4}, nil)

				analyticsTracker.EXPECT().TrackConquestPointsAwarded(gomock.Any(), gomock.Any(), gomock.Any(), uint64(1), uint64(2), uint64(3), uint64(4))
			}

			events, rewards, err := updater.Update(ctx, sess, match)
			require.NoError(t, err)
			assert.Nil(t, events)

			require.Len(t, rewards, 1)
			reward := rewards[0]
			assert.Equal(t, tt.winnerID, reward.AccountID)
			assert.Equal(t, proto.RewardType_CONQUEST_POINTS, reward.Type)
			assert.NotNil(t, reward.ConquestV2TreasureProgress)
			treasureProgress := reward.ConquestV2TreasureProgress
			assert.Equal(t, 0, int(treasureProgress.BeforeMatch.TreasureLevel))
			assert.Equal(t, 0, int(treasureProgress.BeforeMatch.TreasurePoints))
			assert.Equal(t, 250, int(treasureProgress.BeforeMatch.TreasurePointsRequired))
			assert.Equal(t, treasureLevel, treasureProgress.AfterMatch.TreasureLevel)
			assert.Equal(t, treasurePoints, treasureProgress.AfterMatch.TreasurePoints)
			assert.Equal(t, treasurePointsRequired, treasureProgress.AfterMatch.TreasurePointsRequired)

			// Database check
			winnerConquestPoints, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(tt.winnerID, 2)
			require.NoError(t, err)
			assert.Equal(t, expectedCurrentPoints, int(winnerConquestPoints.CurrentPoints))
			assert.Equal(t, expectedTotalPoints, int(winnerConquestPoints.TotalPoints))

			loserConquestPoints, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(tt.loserID, 2)
			require.NoError(t, err)
			assert.Equal(t, 0, int(loserConquestPoints.CurrentPoints))
			assert.Equal(t, 0, int(loserConquestPoints.TotalPoints))

			err = data.DB.ConquestPoints(nil).Find(db.Cond{"event_id": 2}).Delete()
			require.NoError(t, err)
		}
	})

	t.Run("both players earn points when the match is forfeited or abandoned and at least 4 turns", func(t *testing.T) {
		tests := []struct {
			winningPlayer uint
			status        proto.MatchStatus
		}{
			{
				winningPlayer: 1,
				status:        proto.MatchStatus_FORFEITED,
			},
			{
				winningPlayer: 2,
				status:        proto.MatchStatus_FORFEITED,
			},
			{
				winningPlayer: 1,
				status:        proto.MatchStatus_ABANDONED,
			},
			{
				winningPlayer: 2,
				status:        proto.MatchStatus_ABANDONED,
			},
		}

		for _, tt := range tests {
			match := &data.Match{
				Match: &proto.Match{
					Status:                tt.status,
					Player1GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
					Player2GameMode:       proto.GameMode_CONQUEST_CONSTRUCTED,
					Player1ID:             accountID1,
					Player2ID:             accountID2,
					Player1DeckString:     player1DeckString,
					Player2DeckString:     player2DeckString,
					InitPlayer1DeckString: player1DeckString,
					InitPlayer2DeckString: player2DeckString,
					WinningPlayer:         &tt.winningPlayer,
					TurnNonce:             8,
					StartedAt:             &startedAt,
					EndedAt:               &endedAt,
				},
			}

			earnedPoints := uint64(11)

			expectedCurrentPoints := int(earnedPoints)
			expectedTotalPoints := int(earnedPoints)

			treasureLevel := uint16(1)
			treasurePoints := uint64(2)
			treasurePointsRequired := uint64(3)

			err := match.Validate()
			require.NoError(t, err)

			// Mocks
			{
				pointsCalculator.EXPECT().FromDeckString(ctx, gomock.Any(), gomock.Any()).Return(earnedPoints, nil).Times(2)

				treasureCalculator.EXPECT().
					FromConquestPoints(gomock.Any()).
					Return(&data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          0,
							TreasurePoints:         0,
							TreasurePointsRequired: 250,
						}}, nil)
				treasureCalculator.EXPECT().
					FromConquestPoints(gomock.Any()).
					Return(&data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          treasureLevel,
							TreasurePoints:         treasurePoints,
							TreasurePointsRequired: treasurePointsRequired,
						}}, nil)
				treasureCalculator.EXPECT().
					FromConquestPoints(gomock.Any()).
					Return(&data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          0,
							TreasurePoints:         0,
							TreasurePointsRequired: 250,
						}}, nil)
				treasureCalculator.EXPECT().
					FromConquestPoints(gomock.Any()).
					Return(&data.ConquestV2TreasureProgress{
						ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
							TreasureLevel:          treasureLevel,
							TreasurePoints:         treasurePoints,
							TreasurePointsRequired: treasurePointsRequired,
						}}, nil)

				pointsCalculator.EXPECT().DetailedFromDeckString(gomock.Any(), gomock.Any(), gomock.Any()).Return(&conquestv2.DetailedPoints{1, 2, 3, 4}, nil).Times(2)

				analyticsTracker.EXPECT().TrackConquestPointsAwarded(gomock.Any(), gomock.Any(), gomock.Any(), uint64(1), uint64(2), uint64(3), uint64(4)).Times(2)
			}

			events, rewards, err := updater.Update(ctx, sess, match)
			require.NoError(t, err)
			assert.Nil(t, events)

			require.Len(t, rewards, 2)
			for _, reward := range rewards {
				assert.Equal(t, proto.RewardType_CONQUEST_POINTS, reward.Type)
				assert.NotNil(t, reward.ConquestV2TreasureProgress)
				treasureProgress := reward.ConquestV2TreasureProgress
				assert.Equal(t, 0, int(treasureProgress.BeforeMatch.TreasureLevel))
				assert.Equal(t, 0, int(treasureProgress.BeforeMatch.TreasurePoints))
				assert.Equal(t, 250, int(treasureProgress.BeforeMatch.TreasurePointsRequired))
				assert.Equal(t, treasureLevel, treasureProgress.AfterMatch.TreasureLevel)
				assert.Equal(t, treasurePoints, treasureProgress.AfterMatch.TreasurePoints)
				assert.Equal(t, treasurePointsRequired, treasureProgress.AfterMatch.TreasurePointsRequired)
			}

			// Database check
			conquestPoints1, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID1, 2)
			require.NoError(t, err)
			assert.Equal(t, expectedCurrentPoints, int(conquestPoints1.CurrentPoints))
			assert.Equal(t, expectedTotalPoints, int(conquestPoints1.TotalPoints))

			conquestPoints2, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID2, 2)
			require.NoError(t, err)
			assert.Equal(t, expectedCurrentPoints, int(conquestPoints2.CurrentPoints))
			assert.Equal(t, expectedTotalPoints, int(conquestPoints2.TotalPoints))

			err = data.DB.ConquestPoints(nil).Find(db.Cond{"event_id": 2}).Delete()
			require.NoError(t, err)
		}
	})
}
