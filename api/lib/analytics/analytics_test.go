//go:build integration

package analytics_test

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func newFailingTracker(t *testing.T) func(*http.Request, bool, analytics.EventType, *proto.Account, analytics.Props) error {
	return func(*http.Request, bool, analytics.EventType, *proto.Account, analytics.Props) error {
		return errors.New("ain't tracking anything today")
	}
}

func newSilentTracker(t *testing.T) func(*http.Request, bool, analytics.EventType, *proto.Account, analytics.Props) error {
	return func(*http.Request, bool, analytics.EventType, *proto.Account, analytics.Props) error {
		return nil
	}
}

func TestAnalyticsTracker(t *testing.T) {
	var analyticsSink *mock.MockSink
	var policyChecker *mock.MockPolicyChecker

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			analyticsSink = mock.NewMockSink(ctrl)
			policyChecker = mock.NewMockPolicyChecker(ctrl)
		}
	}

	t.Run("start a new tracker with enabled = false and don't expect any events", func(t *testing.T) {
		var isRunning bool

		ctx, cancelFn := context.WithTimeout(context.Background(), time.Second*10)
		defer cancelFn()

		tracker, err := analytics.NewAnalytics(config.Analytics{Enabled: false}, apitest.NewLogger(), policyChecker)
		require.NoError(t, err)
		require.NotNil(t, tracker)

		require.False(t, tracker.IsEnabled())

		err = tracker.AddSink(analyticsSink)
		require.NoError(t, err)

		sinkRunning := make(chan struct{}, 1)
		analyticsSink.EXPECT().Run(gomock.Any()).DoAndReturn(func(ctx context.Context) error {
			sinkRunning <- struct{}{}
			return nil
		})

		err = tracker.Run(ctx)
		require.NoError(t, err)

		isRunning = tracker.IsRunning()
		assert.True(t, isRunning)

		select {
		case <-time.After(time.Second * 5):
			assert.Fail(t, "sink not running")
		case <-sinkRunning:
			// ok
		}

		policyChecker.EXPECT().GetAnalyticsPolicyByAccountID(gomock.Any())

		err = tracker.TrackAccountCreated(nil, 1, nil)
		assert.NoError(t, err)

		// attempt to stop gracefully
		analyticsSink.EXPECT().Stop()
		err = tracker.Stop()
		assert.NoError(t, err)

		isRunning = tracker.IsRunning()
		assert.False(t, isRunning)
	})

	t.Run("start a new tracker and stop it twice", func(t *testing.T) {
		var isRunning bool

		ctx, cancelFn := context.WithTimeout(context.Background(), time.Second*10)
		defer cancelFn()

		tracker, err := analytics.NewAnalytics(config.Analytics{Enabled: true}, apitest.NewLogger(), nil)
		require.NoError(t, err)
		require.NotNil(t, tracker)

		err = tracker.Run(ctx)
		require.NoError(t, err)

		isRunning = tracker.IsRunning()
		assert.True(t, isRunning)

		err = tracker.Stop()
		assert.NoError(t, err)

		isRunning = tracker.IsRunning()
		assert.False(t, isRunning)

		err = tracker.Stop()
		assert.NoError(t, err)
	})

	t.Run("start a new tracker and add a destination then expect to track an event", func(t *testing.T) {
		var isRunning bool

		ctx, cancelFn := context.WithTimeout(context.Background(), time.Second*10)
		defer cancelFn()

		tracker, err := analytics.NewAnalytics(config.Analytics{Enabled: true}, apitest.NewLogger(), policyChecker)
		require.NoError(t, err)
		require.NotNil(t, tracker)

		require.True(t, tracker.IsEnabled())

		err = tracker.AddSink(analyticsSink)
		require.NoError(t, err)

		sinkRunning := make(chan struct{}, 1)
		analyticsSink.EXPECT().Run(gomock.Any()).DoAndReturn(func(ctx context.Context) error {
			sinkRunning <- struct{}{}
			return nil
		})

		err = tracker.Run(ctx)
		require.NoError(t, err)

		err = tracker.AddSink(analyticsSink)
		require.Error(t, err)

		isRunning = tracker.IsRunning()
		assert.True(t, isRunning)

		select {
		case <-time.After(time.Second * 5):
			assert.Fail(t, "sink not running")
		case <-sinkRunning:
			// ok
		}

		policyChecker.EXPECT().GetAnalyticsPolicyByAccountID(gomock.Any()).DoAndReturn(func(accountID proto.AccountID) (*proto.Account, bool, error) {
			return &proto.Account{
				ID:      accountID,
				Name:    "one",
				Address: proto.Hash("0x0000000000000000000000000000000000000001"),
			}, true, nil
		}).AnyTimes()

		// adding more events than what EventsBufferSize allows
		times := 500

		analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_ACCOUNT_CREATED, gomock.Any(), gomock.Any()).DoAndReturn(
			func(r *http.Request, allowTracking bool, event analytics.EventType, account *proto.Account, props analytics.Props) error {
				assert.Equal(t, uint64(1), account.ID.UInt64())
				return nil
			},
		).Times(times)

		var wg sync.WaitGroup

		for i := 0; i < times; i++ {
			wg.Add(1)
			go func(t *testing.T) {
				defer wg.Done()

				err := tracker.TrackAccountCreated(nil, 1, nil)
				assert.NoError(t, err)
			}(t)
		}

		wg.Wait()

		// attempt to stop gracefully
		analyticsSink.EXPECT().Stop()
		err = tracker.Stop()
		assert.NoError(t, err)

		isRunning = tracker.IsRunning()
		assert.False(t, isRunning)
	})
}

func TestAnalyticsTrackerEvents(t *testing.T) {
	var analyticsSink *mock.MockSink
	var policyChecker *mock.MockPolicyChecker

	trackingFn := newSilentTracker(t)
	// trackingFn := newLoggingTracker(t)

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			analyticsSink = mock.NewMockSink(ctrl)
			policyChecker = mock.NewMockPolicyChecker(ctrl)

			analyticsSink.EXPECT().Name().Return("mock-tracker").AnyTimes()
		}
	}

	t.Run("start a new tracker and track different events", func(t *testing.T) {
		var isRunning bool

		ctx, cancelFn := context.WithTimeout(context.Background(), time.Second*10)
		defer cancelFn()

		tracker, err := analytics.NewAnalytics(config.Analytics{Enabled: true}, apitest.NewLogger(), policyChecker)
		require.NoError(t, err)
		require.NotNil(t, tracker)

		err = tracker.AddSink(analyticsSink)
		require.NoError(t, err)

		analyticsSink.EXPECT().Run(gomock.Any()).AnyTimes().Return(nil)

		err = tracker.Run(ctx)
		require.NoError(t, err)

		isRunning = tracker.IsRunning()
		assert.True(t, isRunning)

		policyChecker.EXPECT().GetAnalyticsPolicyByAccountID(gomock.Any()).DoAndReturn(func(accountID proto.AccountID) (*proto.Account, bool, error) {
			return &proto.Account{
				ID:      accountID,
				Name:    "one",
				Address: proto.Hash("0x0000000000000000000000000000000000000001"),
			}, true, nil
		}).AnyTimes()

		// TrackAccountCreated
		t.Run("TrackAccountCreated", func(t *testing.T) {
			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_ACCOUNT_CREATED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
			err = tracker.TrackAccountCreated(nil, 1, &proto.DeviceProperties{})
			assert.NoError(t, err)

			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_ACCOUNT_CREATED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
			err = tracker.TrackAccountCreated(nil, 1, nil)
			assert.NoError(t, err)

			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_ACCOUNT_CREATED, gomock.Any(), gomock.Any()).Return(errors.New("mock failed"))
			err = tracker.TrackAccountCreated(nil, 1, nil)
			assert.NoError(t, err) // error is logged
		})

		// TrackEndMatch
		t.Run("TrackEndMatch", func(t *testing.T) {
			matchStartTime := time.Now().Add(-time.Minute * 5)
			matchEndTime := time.Now()
			winningPlayer := uint(1)
			p1DeckString := "SWxHRT02"
			p2DeckString := "SWxSTR02"

			err = tracker.TrackEndMatch(nil, nil, nil)
			assert.Error(t, err)

			err = tracker.TrackEndMatch(nil, &data.Match{}, &proto.MatchEndRequest{})
			assert.Error(t, err)

			err = tracker.TrackEndMatch(nil, &data.Match{Match: &proto.Match{}}, &proto.MatchEndRequest{})
			assert.NoError(t, err, "no valid IDs given")

			err = tracker.TrackEndMatch(nil, &data.Match{
				Match: &proto.Match{
					Player1ID: 1,
					Player2ID: 2,
				},
			}, &proto.MatchEndRequest{})
			assert.Error(t, err)

			err = tracker.TrackEndMatch(nil, &data.Match{
				Match: &proto.Match{
					Player1ID: 1,
					Player2ID: 2,
					StartedAt: &matchStartTime,
				},
			}, &proto.MatchEndRequest{})
			assert.Error(t, err)

			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_MATCH_ENDED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn).Times(2)

			err = tracker.TrackEndMatch(nil, &data.Match{
				Match: &proto.Match{
					Player1ID:             1,
					Player2ID:             2,
					StartedAt:             &matchStartTime,
					EndedAt:               &matchEndTime,
					WinningPlayer:         &winningPlayer,
					Player1DeckString:     p1DeckString,
					InitPlayer1DeckString: p1DeckString,
					Player2DeckString:     p2DeckString,
					InitPlayer2DeckString: p2DeckString,
				},
			}, &proto.MatchEndRequest{})
			assert.NoError(t, err)
		})

		// TrackRewardMatch
		t.Run("TrackRewardMatch", func(t *testing.T) {
			var rewards []*proto.Reward
			var matchEndRequest *proto.MatchEndRequest
			var match *data.Match

			err = tracker.TrackRewardMatch(nil, rewards, matchEndRequest, match)
			assert.Error(t, err)

			rewards = []*proto.Reward{
				&proto.Reward{
					Type: proto.RewardType_CARD,
					Card: &proto.RewardCard{
						Card:   &proto.Card{ID: 1},
						Amount: 1,
					},
				},
				&proto.Reward{
					Type: proto.RewardType_CARD,
					Card: &proto.RewardCard{
						Card:   &proto.Card{ID: 2},
						Amount: 1,
					},
				},
				&proto.Reward{
					Type: proto.RewardType_CARD,
					Card: &proto.RewardCard{
						Card:   &proto.Card{ID: 3},
						Amount: 1,
					},
				},
			}

			err = tracker.TrackRewardMatch(nil, rewards, matchEndRequest, match)
			assert.Error(t, err)

			match = &data.Match{
				Match: &proto.Match{
					Player1GameMode: proto.GameMode_RANKED_DISCOVERY,
					Player2GameMode: proto.GameMode_RANKED_DISCOVERY,
				},
			}

			err = tracker.TrackRewardMatch(nil, rewards, matchEndRequest, match)
			assert.Error(t, err)

			matchEndRequest = &proto.MatchEndRequest{}

			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_MATCH_GOT_REWARD, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn).Times(3)

			err := tracker.TrackRewardMatch(nil, rewards, matchEndRequest, match)
			assert.NoError(t, err)
		})

		// TrackStartMatch
		t.Run("TrackStartMatch", func(t *testing.T) {
			var err error

			var match *proto.Match
			var matchStartRequest *proto.MatchStartRequest

			err = tracker.TrackStartMatch(nil, match, matchStartRequest)
			assert.Error(t, err)

			match = &proto.Match{
				Player1ID: 1,
				Player2ID: 2,
			}

			matchStartRequest = &proto.MatchStartRequest{}

			err = tracker.TrackStartMatch(nil, match, matchStartRequest)
			assert.Error(t, err)

			{
				match = &proto.Match{
					Player1ID:             1,
					Player2ID:             2,
					InitPlayer1DeckString: "SWxHRT02",
					InitPlayer2DeckString: "SWxAGY02",
				}

				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_MATCH_STARTED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn).Times(2)

				err = tracker.TrackStartMatch(nil, match, matchStartRequest)
				assert.NoError(t, err)
			}

			{
				match = &proto.Match{
					Player1ID:             1,
					InitPlayer1DeckString: "SWxHRT02",
				}

				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_MATCH_STARTED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)

				err = tracker.TrackStartMatch(nil, match, matchStartRequest)
				assert.NoError(t, err)
			}

			{
				match = &proto.Match{
					Player2ID:             1,
					InitPlayer2DeckString: "SWxHRT02",
				}

				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_MATCH_STARTED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)

				err = tracker.TrackStartMatch(nil, match, matchStartRequest)
				assert.NoError(t, err)
			}
		})

		t.Run("TrackLevelUps", func(t *testing.T) {
			var err error

			err = tracker.TrackLevelUps(nil, 1, 0, 1, 1)
			assert.Error(t, err)

			err = tracker.TrackLevelUps(nil, 1, 2, 1, 1)
			assert.Error(t, err)

			err = tracker.TrackLevelUps(nil, 1, 1, 1, 1)
			assert.NoError(t, err, "no changes")

			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_ACCOUNT_LEVELED_UP, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
			err = tracker.TrackLevelUps(nil, 1, 1, 2, 1)
			assert.NoError(t, err)

			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_ACCOUNT_LEVELED_UP, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn).Times(5)
			err = tracker.TrackLevelUps(nil, 1, 1, 6, 1)
			assert.NoError(t, err)
		})

		t.Run("TrackAccountBanning", func(t *testing.T) {
			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_ACCOUNT_STATUS_UPDATED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
			err = tracker.TrackAccountBanning(nil, 1, proto.AccountStatus_BANNED)
			assert.NoError(t, err)
		})

		t.Run("TrackTutorialEnd", func(t *testing.T) {
			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_TUTORIAL_ENDED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
			err = tracker.TrackTutorialEnd(nil, 1, []int{1, 2, 3})
			assert.NoError(t, err)
		})

		t.Run("TrackConquestPointsAwarded", func(t *testing.T) {
			var treasureProgress *data.ConquestV2TreasureProgress
			var matchPoints, silverCardPoints, goldCardPoints, heroSkinPoints uint64

			{
				err = tracker.TrackConquestPointsAwarded(nil, 1, treasureProgress, matchPoints, silverCardPoints, goldCardPoints, heroSkinPoints)
				assert.Error(t, err)
			}

			{
				treasureProgress = &data.ConquestV2TreasureProgress{}
				err = tracker.TrackConquestPointsAwarded(nil, 1, treasureProgress, matchPoints, silverCardPoints, goldCardPoints, heroSkinPoints)
				assert.Error(t, err)
			}

			{
				treasureProgress = &data.ConquestV2TreasureProgress{
					ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{},
				}
				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_GOT_CONQUEST_POINTS, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
				err = tracker.TrackConquestPointsAwarded(nil, 1, treasureProgress, matchPoints, silverCardPoints, goldCardPoints, heroSkinPoints)
				assert.NoError(t, err)
			}

			{
				matchPoints = 1
				silverCardPoints = 2
				goldCardPoints = 3
				heroSkinPoints = 4

				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_GOT_CONQUEST_POINTS, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
				err = tracker.TrackConquestPointsAwarded(nil, 1, treasureProgress, matchPoints, silverCardPoints, goldCardPoints, heroSkinPoints)
				assert.NoError(t, err)
			}
		})

		t.Run("TrackItemPurchase", func(t *testing.T) {
			var err error
			var itemPurchase *proto.AnalyticsItemPurchase

			{
				err = tracker.TrackItemPurchase(nil, itemPurchase)
				assert.Error(t, err)
			}

			{
				itemPurchase = &proto.AnalyticsItemPurchase{}

				err = tracker.TrackItemPurchase(nil, itemPurchase)
				assert.Error(t, err)
			}

			{
				itemPurchase = &proto.AnalyticsItemPurchase{
					ItemType: proto.ItemType_SW_CONQUEST_TICKET,
				}

				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_CONQUEST_TICKET_MINTED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
				err = tracker.TrackItemPurchase(nil, itemPurchase)
				assert.NoError(t, err)
			}

			{
				itemPurchase = &proto.AnalyticsItemPurchase{
					ItemType: proto.ItemType_SW_SKYPASS,
				}

				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_SKYPASS_PURCHASED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
				err = tracker.TrackItemPurchase(nil, itemPurchase)
				assert.NoError(t, err)
			}

		})

		t.Run("TrackTreasureRewards", func(t *testing.T) {
			var treasureProgress *data.ConquestV2TreasureProgress
			var usdcAmount float32

			{
				err = tracker.TrackTreasureRewards(nil, 1, treasureProgress, usdcAmount)
				assert.Error(t, err)
			}

			{
				treasureProgress = &data.ConquestV2TreasureProgress{}
				err = tracker.TrackTreasureRewards(nil, 1, treasureProgress, usdcAmount)
				assert.Error(t, err)
			}

			{
				treasureProgress = &data.ConquestV2TreasureProgress{
					ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
						TreasureLevel:  1,
						TreasurePoints: 2,
					},
				}
				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_GOT_TREASURE_REWARD, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
				err = tracker.TrackTreasureRewards(nil, 1, treasureProgress, usdcAmount)
				assert.NoError(t, err)
			}
		})

		t.Run("TrackSkypassRewardsClaim", func(t *testing.T) {
			var err error
			var rewards []*proto.Reward

			{
				err = tracker.TrackSkypassRewardsClaim(nil, 1, rewards)
				assert.NoError(t, err, "nothing to do")
			}

			rewards = []*proto.Reward{nil}

			{
				err = tracker.TrackSkypassRewardsClaim(nil, 1, rewards)
				assert.Error(t, err)
			}

			gameMode := proto.GameMode_RANKED_DISCOVERY

			rewards = []*proto.Reward{
				&proto.Reward{
					Type:     proto.RewardType_CARD,
					GameMode: &gameMode,
					Card: &proto.RewardCard{
						Card: &proto.Card{
							ID: 1,
						},
					},
				},
			}

			analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_SKYPASS_REWARD_CLAIMED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)

			{
				err = tracker.TrackSkypassRewardsClaim(nil, 1, rewards)
				assert.NoError(t, err)
			}
		})

		t.Run("TrackTutorialStatus", func(t *testing.T) {
			var err error
			var match *data.Match

			{
				err = tracker.TrackTutorialStatus(nil, 1, nil)
				assert.Error(t, err)
			}

			match = &data.Match{}
			{
				err = tracker.TrackTutorialStatus(nil, 1, match)
				assert.Error(t, err)
			}

			match = &data.Match{Match: &proto.Match{}}
			{
				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_TUTORIAL_STATUS_UPDATED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
				err = tracker.TrackTutorialStatus(nil, 1, match)
				assert.NoError(t, err)
			}
		})

		t.Run("TrackCompletedQuestClaim", func(t *testing.T) {
			var assignment *data.QuestAssignment

			{
				err = tracker.TrackCompletedQuestClaim(nil, 1, nil)
				assert.Error(t, err)
			}

			assignment = &data.QuestAssignment{}
			{
				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_QUEST_COMPLETION_CLAIMED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
				err = tracker.TrackCompletedQuestClaim(nil, 1, assignment)
				assert.NoError(t, err)
			}
		})

		t.Run("TrackQuestCompletion", func(t *testing.T) {
			var assignment *data.QuestAssignment

			{
				err = tracker.TrackQuestCompletion(nil, 1, nil)
				assert.Error(t, err)
			}

			assignment = &data.QuestAssignment{}
			{
				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_QUEST_COMPLETED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
				err = tracker.TrackQuestCompletion(nil, 1, assignment)
				assert.NoError(t, err)
			}
		})

		t.Run("TrackRerollQuest", func(t *testing.T) {
			var assignment *data.QuestAssignment

			{
				err = tracker.TrackRerollQuest(nil, 1, nil)
				assert.Error(t, err)
			}

			assignment = &data.QuestAssignment{}
			{
				analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_QUEST_REROLLED, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn)
				err = tracker.TrackRerollQuest(nil, 1, assignment)
				assert.NoError(t, err)
			}
		})

		// Stopping tracker

		analyticsSink.EXPECT().Stop()
		err = tracker.Stop()
		assert.NoError(t, err)

		isRunning = tracker.IsRunning()
		assert.False(t, isRunning)
	})
}

func TestAnalyticsTrackerWithBadDestinations(t *testing.T) {
	var analyticsSink *mock.MockSink
	var policyChecker *mock.MockPolicyChecker

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			analyticsSink = mock.NewMockSink(ctrl)
			policyChecker = mock.NewMockPolicyChecker(ctrl)

			policyChecker.EXPECT().GetAnalyticsPolicyByAccountID(gomock.Any()).DoAndReturn(func(accountID proto.AccountID) (*proto.Account, bool, error) {
				return &proto.Account{
					ID:      accountID,
					Name:    "one",
					Address: proto.Hash("0x0000000000000000000000000000000000000001"),
				}, true, nil
			}).AnyTimes()

			analyticsSink.EXPECT().Name().Return("mock-tracker").AnyTimes()
		}
	}

	trackingFn := newFailingTracker(t)

	t.Run("start a new tracker and add a bad destination that is unable to exit", func(t *testing.T) {
		var isRunning bool

		ctx := context.Background()

		tracker, err := analytics.NewAnalytics(config.Analytics{Enabled: true}, apitest.NewLogger(), policyChecker)
		require.NoError(t, err)
		require.NotNil(t, tracker)

		require.True(t, tracker.IsEnabled())

		err = tracker.AddSink(analyticsSink)
		require.NoError(t, err)

		sinkStarting := make(chan struct{}, 1)
		analyticsSink.EXPECT().Run(gomock.Any()).DoAndReturn(func(ctx context.Context) error {
			// Simulates a long-running blocking sink that is unable to start or exit
			// even if Stop is called on it.
			sinkStarting <- struct{}{}
			time.Sleep(time.Second * 120)
			return errors.New("misbehavin' til the end")
		}).AnyTimes()

		err = tracker.Run(ctx)
		require.NoError(t, err)

		isRunning = tracker.IsRunning()
		assert.True(t, isRunning)

		select {
		case <-time.After(time.Second * 5):
			assert.Fail(t, "sink not starting")
		case <-sinkStarting:
			// ok
		}

		analyticsSink.EXPECT().Track(gomock.Any(), true, analytics.EventType_ACCOUNT_LEVELED_UP, gomock.Any(), gomock.Any()).DoAndReturn(trackingFn).AnyTimes()

		// enqueue many events to be tracked
		var wg sync.WaitGroup
		for i := 0; i < 200; i++ {
			wg.Add(1)
			go func(t *testing.T) {
				defer wg.Done()

				err := tracker.TrackLevelUps(nil, 1, 1, 2, 0)
				assert.NoError(t, err)
			}(t)
		}

		wg.Wait()

		// attempt to stop gracefully
		analyticsSink.EXPECT().Stop()
		err = tracker.Stop()
		assert.NoError(t, err)

		isRunning = tracker.IsRunning()
		assert.False(t, isRunning)

		wg.Wait()
	})
}
