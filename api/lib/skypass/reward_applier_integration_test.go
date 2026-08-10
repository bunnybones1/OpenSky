//go:build integration

package skypass_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/skypass"
	"github.com/horizon-games/OpenSky/api/lib/skypass/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestRewardApplier(t *testing.T) {
	var accountID, anotherAccountID proto.AccountID

	var cardIndex *mock.MockCardIndex

	var metricsCollector *mock.MockMetricsCollector

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestRewardApplier")
			require.NoError(t, err)

			anotherAccountID = apitest.RandomAccountID()
		}

		// Decks
		{
			err := data.CreateStarterDecks(data.DB, accountID)
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			cardIndex = mock.NewMockCardIndex(ctrl)
			metricsCollector = mock.NewMockMetricsCollector(ctrl)
			metricsCollector.EXPECT().TrackSkypassClaim(gomock.Any()).AnyTimes()
		}
	}

	season := data.CurrentSeason()

	rewardApplier := skypass.NewRewardApplier(cardIndex, metricsCollector)

	t.Run("hero", func(t *testing.T) {
		typeHero := proto.ItemType_SW_HERO

		t.Run("specific heroes when token IDs provided", func(t *testing.T) {
			// Setup
			{
				t.Cleanup(func() {
					err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			hero := proto.Hero_MAI

			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeHero,
				Attributes: &proto.SkypassRewardAttributes{
					TokenIDs: []uint64{
						uint64(hero),
					},
				},
			}}

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			assert.Len(t, gainedRewards, 1)
			assert.Equal(t, proto.RewardType_HERO, gainedRewards[0].Type)
			assert.Equal(t, hero, gainedRewards[0].Hero.Hero)

			item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_HERO, uint64(hero))
			require.NoError(t, err)
			assert.NotNil(t, item)

			feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_HERO_UNLOCK})
			require.NoError(t, err)
			assert.NotNil(t, feedEvent)
		})

		t.Run("unlocks starter deck when hero deck class has some", func(t *testing.T) {
			// Setup
			{
				t.Cleanup(func() {
					err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			hero := proto.Hero_SAMYA
			deckClass := proto.DeckClass_AGY

			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeHero,
				Attributes: &proto.SkypassRewardAttributes{
					TokenIDs: []uint64{
						uint64(hero),
					},
				},
			}}

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			assert.Len(t, gainedRewards, 2)

			var heroFound, deckFound bool

			for _, gainedReward := range gainedRewards {
				if gainedReward.Type == proto.RewardType_HERO {
					heroFound = true

					assert.Equal(t, hero, gainedReward.Hero.Hero)
				} else if gainedReward.Type == proto.RewardType_DECK {
					deckFound = true

					assert.Equal(t, deckClass, gainedReward.Deck.DeckClass)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_STARTED_DECK_UNLOCK})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				}
			}

			assert.True(t, heroFound)
			assert.True(t, deckFound)
		})

		t.Run("does not fail when hero unlocked already", func(t *testing.T) {
			hero := proto.Hero_BANJO

			// Setup
			{
				// Heroes
				{
					err := data.UnlockHero(data.DB, accountID, hero)
					require.NoError(t, err)
				}
			}

			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeHero,
				Attributes: &proto.SkypassRewardAttributes{
					TokenIDs: []uint64{
						uint64(hero),
					},
				},
			}}

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			assert.Len(t, gainedRewards, 1)
			assert.Equal(t, proto.RewardType_HERO, gainedRewards[0].Type)
			assert.Equal(t, hero, gainedRewards[0].Hero.Hero)
		})
	})

	t.Run("base card", func(t *testing.T) {
		var populatedItemIDs []uint64

		typeBaseCard := proto.ItemType_SW_BASE_CARDS
		cardSet := proto.CardSet_HEXBOUND_INVASION

		cardBase := &data.Card{Card: &proto.Card{ID: 1}}
		cardSilver := &data.Card{Card: &proto.Card{ID: 2}}
		cardGold := &data.Card{Card: &proto.Card{ID: 3}}
		cardBaseInSet := &data.Card{Card: &proto.Card{ID: 4, Set: cardSet}}
		cardWithInvalidSeason := &data.Card{Card: &proto.Card{ID: 5, ValidFromSeason: season + 1}}

		cardClass := proto.CardClass_HRT
		cardWithTheSamePrism := &data.Card{Card: &proto.Card{ID: 11, Class: cardClass}}
		cardWithAnotherPrism := &data.Card{Card: &proto.Card{ID: 12, Class: proto.CardClass_WIS}}

		cardWithTheSameSet := &data.Card{Card: &proto.Card{ID: 21, Set: cardSet}}
		cardWithAnotherSet := &data.Card{Card: &proto.Card{ID: 22, Set: proto.CardSet_CORE_EXPANSION}}

		cardRandom := &data.Card{Card: &proto.Card{ID: 31}}

		// Setup
		{
			cardClass1 := cardClass
			deckClass1 := proto.DeckClass_HRT
			cardClass2 := proto.CardClass_STR
			deckClass2 := proto.DeckClass_STR

			// Create deck strings
			var player1DeckString, player2DeckString string
			{
				var err error
				cardIDs := getDeckForClass(cardClass1, data.SinglePrismDeckSize)
				player1DeckString, err = data.EncodeDeckString(cardIDs, deckClass1)
				require.NoError(t, err)
				require.NotEmpty(t, player1DeckString)

				cardIDs = getDeckForClass(cardClass2, data.SinglePrismDeckSize)
				player2DeckString, err = data.EncodeDeckString(cardIDs, deckClass2)
				require.NoError(t, err)
				require.NotEmpty(t, player2DeckString)
			}

			// Matches
			{
				startedAt := data.TimeNowUTC().Add(-11 * time.Minute)
				endedAt := data.TimeNowUTC().Add(-10 * time.Minute)
				match1 := &data.Match{
					Match: &proto.Match{
						Status:                proto.MatchStatus_COMPLETED,
						Player1ID:             accountID,
						Player2ID:             anotherAccountID,
						Player1DeckClass:      &deckClass2,
						Player2DeckClass:      &deckClass1,
						Player1DeckString:     player2DeckString,
						Player2DeckString:     player1DeckString,
						InitPlayer1DeckString: player2DeckString,
						InitPlayer2DeckString: player1DeckString,
						StartedAt:             &startedAt,
						EndedAt:               &endedAt,
					},
				}
				err := data.DB.Save(match1)
				require.NoError(t, err)

				startedAt = data.TimeNowUTC().Add(-2 * time.Minute)
				endedAt = data.TimeNowUTC().Add(-1 * time.Minute)
				match2 := &data.Match{
					Match: &proto.Match{
						Status:                proto.MatchStatus_COMPLETED,
						Player1ID:             accountID,
						Player2ID:             anotherAccountID,
						Player1DeckClass:      &deckClass1,
						Player2DeckClass:      &deckClass2,
						Player1DeckString:     player1DeckString,
						Player2DeckString:     player2DeckString,
						InitPlayer1DeckString: player1DeckString,
						InitPlayer2DeckString: player2DeckString,
						StartedAt:             &startedAt,
						EndedAt:               &endedAt,
					},
				}
				err = data.DB.Save(match2)
				require.NoError(t, err)
			}

			// Items
			{
				item := &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_BASE_CARDS,
						TokenID:   cardBase.ID,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err := data.DB.Save(item)
				require.NoError(t, err)
				populatedItemIDs = append(populatedItemIDs, item.ID)

				item = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_SILVER_CARDS,
						TokenID:   cardSilver.ID,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err = data.DB.Save(item)
				require.NoError(t, err)
				populatedItemIDs = append(populatedItemIDs, item.ID)

				item = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_GOLD_CARDS,
						TokenID:   cardGold.ID,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err = data.DB.Save(item)
				require.NoError(t, err)
				populatedItemIDs = append(populatedItemIDs, item.ID)

				item = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_BASE_CARDS,
						TokenID:   cardBaseInSet.ID,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err = data.DB.Save(item)
				require.NoError(t, err)
				populatedItemIDs = append(populatedItemIDs, item.ID)

				item = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_BASE_CARDS,
						TokenID:   999,
						Balance:   prototyp.NewBigInt(0),
					},
				}
				err = data.DB.Save(item)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}
		}

		t.Run("specific card when token IDs provided", func(t *testing.T) {
			t.Run("gains the card when it is not owned yet", func(t *testing.T) {
				// Setup
				{
					t.Cleanup(func() {
						err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
						require.NoError(t, err)

						err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}

				reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
					ItemType: &typeBaseCard,
					Attributes: &proto.SkypassRewardAttributes{
						TokenIDs: []uint64{cardSilver.ID},
					},
					Season: season,
				}}

				cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
				cardIndex.EXPECT().GetCardByID(cardSilver.ID).Return(cardSilver)

				gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
				require.NoError(t, err)

				require.Len(t, gainedRewards, 1)
				checkGainedBaseCard(t, accountID, gainedRewards[0])
				assert.Equal(t, cardSilver.ID, gainedRewards[0].Card.Card.ID)
				assert.Equal(t, proto.ItemType_SW_BASE_CARDS, gainedRewards[0].Card.Card.ItemType)

				feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
				require.NoError(t, err)
				assert.NotNil(t, feedEvent)
			})

			t.Run("behaves like for a random card when the card is already owned", func(t *testing.T) {
				// Setup
				{
					t.Cleanup(func() {
						err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
						require.NoError(t, err)

						err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}

				reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
					ItemType: &typeBaseCard,
					Attributes: &proto.SkypassRewardAttributes{
						TokenIDs: []uint64{cardBase.ID},
					},
					Season: season,
				}}

				cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
				cardIndex.EXPECT().GetCardByID(cardBase.ID).Return(cardBase)
				cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherPrism)
				cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherPrism)
				cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(nil)
				cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardRandom)

				gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
				require.NoError(t, err)

				require.Len(t, gainedRewards, 1)
				checkGainedBaseCard(t, accountID, gainedRewards[0])
				assert.Equal(t, cardRandom.ID, gainedRewards[0].Card.Card.ID)
				assert.Equal(t, proto.ItemType_SW_BASE_CARDS, gainedRewards[0].Card.Card.ItemType)

				feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
				require.NoError(t, err)
				assert.NotNil(t, feedEvent)
			})
		})

		t.Run("random card when no attributes provided", func(t *testing.T) {
			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeBaseCard,
				Amount:   1,
				Season:   season,
			}}

			t.Run("has the same prism as the deck of the last match", func(t *testing.T) {
				t.Run("is different card than silver or gold owned cards when there are still absent cards in the prism", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithTheSamePrism)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardWithTheSamePrism.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})

				t.Run("is the same card as silver or gold owned cards when there are no absent cards in the prism", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherPrism)
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithTheSamePrism)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardWithTheSamePrism.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})
			})

			t.Run("has different prism than the deck of the last match when all based cards of the prism are owned already", func(t *testing.T) {
				t.Run("is different card than silver or gold owned cards when there are still absent base cards", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherPrism)
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherPrism)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardRandom)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardRandom.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})

				t.Run("is the same card as silver or gold owned cards when there are no absent base cards", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherPrism)
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherPrism)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardRandom)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardRandom.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})
			})
		})

		t.Run("random card from set when the card set is provided", func(t *testing.T) {
			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeBaseCard,
				Amount:   1,
				Attributes: &proto.SkypassRewardAttributes{
					CardSets: []*proto.CardSet{&cardSet},
				},
				Season: season,
			}}

			t.Run("belongs to the same set as the provided", func(t *testing.T) {
				t.Run("is different card than silver or gold owned cards when there are still absent cards in the set", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithTheSameSet)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardWithTheSameSet.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})

				t.Run("is the same card as silver or gold owned cards when there are no absent cards in the set", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherSet)
					cardIndex.EXPECT().GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithTheSameSet)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardWithTheSameSet.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})
			})

			t.Run("behaves like for a random card when all based cards of the set are owned already", func(t *testing.T) {
				// Setup
				{
					t.Cleanup(func() {
						err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
						require.NoError(t, err)

						err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}

				cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
				cardIndex.EXPECT().GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherSet)
				cardIndex.EXPECT().GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherSet)
				cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherPrism)
				cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithAnotherPrism)
				cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(nil)
				cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardRandom)

				gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
				require.NoError(t, err)

				require.Len(t, gainedRewards, 1)
				checkGainedBaseCard(t, accountID, gainedRewards[0])
				assert.Equal(t, cardRandom.ID, gainedRewards[0].Card.Card.ID)

				feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
				require.NoError(t, err)
				assert.NotNil(t, feedEvent)
			})
		})

		t.Run("random card when the excluded card set is provided", func(t *testing.T) {
			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeBaseCard,
				Amount:   1,
				Attributes: &proto.SkypassRewardAttributes{
					CardSetsExcluded: []*proto.CardSet{&cardSet},
				},
				Season: season,
			}}

			t.Run("belongs to different set than the excluded card set provided", func(t *testing.T) {
				t.Run("is different card than silver or gold owned cards when there are still absent cards", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().CardIDsByCardSets(&cardSet).Return([]uint64{cardWithTheSameSet.ID})
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(cardWithAnotherSet)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardWithAnotherSet.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})

				t.Run("is the same card as silver or gold owned cards when there are no absent cards", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().CardIDsByCardSets(&cardSet).Return([]uint64{cardWithTheSameSet.ID})
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(cardWithAnotherSet)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardWithAnotherSet.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})
			})

			t.Run("belongs to the same set as the excluded card set provided when all other base cards are owned already", func(t *testing.T) {
				t.Run("is different card than silver or gold owned cards when there are still absent cards", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().CardIDsByCardSets(&cardSet).Return([]uint64{cardWithTheSameSet.ID})
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithTheSameSet)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardWithTheSameSet.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})

				t.Run("is the same card as silver or gold owned cards when there are no absent cards", func(t *testing.T) {
					// Setup
					{
						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
							require.NoError(t, err)

							err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
					cardIndex.EXPECT().CardIDsByCardSets(&cardSet).Return([]uint64{cardWithTheSameSet.ID})
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(nil)
					cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(cardWithTheSameSet)

					gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
					require.NoError(t, err)

					require.Len(t, gainedRewards, 1)
					checkGainedBaseCard(t, accountID, gainedRewards[0])
					assert.Equal(t, cardWithTheSameSet.ID, gainedRewards[0].Card.Card.ID)

					feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
					require.NoError(t, err)
					assert.NotNil(t, feedEvent)
				})
			})

			t.Run("does not fail when all cards are owned already", func(t *testing.T) {
				// Setup
				{
					t.Cleanup(func() {
						err := data.DB.Items().Find(db.Cond{"account_id": accountID, "id": db.NotAnyOf(populatedItemIDs)}).Delete()
						require.NoError(t, err)

						err = data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}

				cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
				cardIndex.EXPECT().CardIDsByCardSets(&cardSet).Return([]uint64{cardWithTheSameSet.ID})
				cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
				cardIndex.EXPECT().GetRandomCardByClasses([]proto.CardClass{cardClass}, []uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
				cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
				cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID, cardWithTheSameSet.ID}).Return(nil)
				cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardSilver.ID, cardGold.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(nil)
				cardIndex.EXPECT().GetRandomCard([]uint64{cardBase.ID, cardBaseInSet.ID, cardWithInvalidSeason.ID}).Return(nil)

				gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
				require.NoError(t, err)
				require.Len(t, gainedRewards, 0)
			})
		})
	})

	t.Run("conquest ticket", func(t *testing.T) {
		typeConquestTicket := proto.ItemType_SW_CONQUEST_TICKET

		// Setup
		{
			t.Cleanup(func() {
				err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)

				err = data.DB.Tasks().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
			ID:       10,
			ItemType: &typeConquestTicket,
			Amount:   2,
		}}

		gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
		require.NoError(t, err)

		assert.Len(t, gainedRewards, 1)
		assert.Equal(t, proto.RewardType_CONQUEST_TICKET, gainedRewards[0].Type)

		feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
		require.NoError(t, err)
		assert.NotNil(t, feedEvent)
		assert.Equal(t, int(data.ConquestTicketTokenID), int(feedEvent.TokenIDs[0]))

		conquestTickets, err := data.DB.Items().GetConquestTickets(accountID)
		require.NoError(t, err)
		assert.Equal(t, int(reward.Amount), int(conquestTickets))
	})

	t.Run("sticker", func(t *testing.T) {
		typeSticker := proto.ItemType_SW_STICKERS

		var stickerID1, stickerID2 uint64
		var stickerTokenID1, stickerTokenID2 uint64

		// Setup
		{
			// Stickers
			{
				stickerID1 = 1
				stickerTokenID1 = data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_STICKERS, stickerID1)
				sticker1 := &data.Sticker{
					Sticker: &proto.Sticker{
						TokenID: stickerTokenID1,
					},
				}
				err := data.DB.Save(sticker1)
				require.NoError(t, err)

				stickerID2 = 2
				stickerTokenID2 = data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_STICKERS, stickerID2)
				sticker2 := &data.Sticker{
					Sticker: &proto.Sticker{
						TokenID: stickerTokenID2,
					},
				}
				err = data.DB.Save(sticker2)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.Stickers().Find().Delete()
					require.NoError(t, err)
				})
			}

			t.Cleanup(func() {
				err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)

				err = data.DB.Tasks().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		t.Run("specific stickers when token IDs provided", func(t *testing.T) {
			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ID:       10,
				ItemType: &typeSticker,
				Attributes: &proto.SkypassRewardAttributes{
					TokenIDs: []uint64{stickerID1, stickerID2},
				},
			}}

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			assert.Len(t, gainedRewards, 1)
			assert.Equal(t, proto.RewardType_STICKER, gainedRewards[0].Type)

			_, payload, err := getMintSkypassStickersTask(accountID)
			require.NoError(t, err)

			assert.Equal(t, accountID, payload.AccountID)
			require.Len(t, payload.StickerAmounts, 2)
			assert.Equal(t, 100, int(payload.StickerAmounts[stickerTokenID1]))
			assert.Equal(t, 100, int(payload.StickerAmounts[stickerTokenID2]))
			assert.Equal(t, reward.ID, payload.SkypassRewardID)

			feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
			require.NoError(t, err)
			assert.NotNil(t, feedEvent)
			assert.Contains(t, feedEvent.TokenIDs, stickerTokenID1)
			assert.Contains(t, feedEvent.TokenIDs, stickerTokenID2)
		})
	})

	t.Run("sticker point", func(t *testing.T) {
		// Setup
		{
			t.Cleanup(func() {
				err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		typeStickerPoints := proto.ItemType_SW_STICKER_POINTS
		amount := uint16(2)

		reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
			ID:       11,
			ItemType: &typeStickerPoints,
			Amount:   amount,
		}}

		gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
		require.NoError(t, err)

		assert.Len(t, gainedRewards, 1)
		assert.Equal(t, proto.RewardType_STICKER_POINTS, gainedRewards[0].Type)
		assert.Equal(t, &amount, gainedRewards[0].StickerPoints)

		stickerPoints, err := data.DB.Items(data.DB.Session).GetStickerPoints(accountID)
		require.NoError(t, err)
		require.Equal(t, amount, uint16(stickerPoints))

		feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
		require.NoError(t, err)
		assert.NotNil(t, feedEvent)
		assert.Equal(t, &amount, feedEvent.StickerPoints)
	})

	t.Run("silver card", func(t *testing.T) {
		typeSilverCard := proto.ItemType_SW_SILVER_CARDS

		cardID1 := uint64(1)
		cardID2 := uint64(2)
		cardTokenID1 := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_SILVER_CARDS, cardID1)
		cardTokenID2 := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_SILVER_CARDS, cardID2)
		card1 := &data.Card{Card: &proto.Card{ID: cardID1, SilverCardTokenID: &cardTokenID1}}
		card2 := &data.Card{Card: &proto.Card{ID: cardID2, SilverCardTokenID: &cardTokenID2}}
		cardWithInvalidSeason := &data.Card{Card: &proto.Card{ID: 3, ValidFromSeason: season + 1}}

		cardSet := proto.CardSet_HEXBOUND_INVASION

		t.Run("specific card when token IDs provided", func(t *testing.T) {
			// Setup
			{
				t.Cleanup(func() {
					err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)

					err = data.DB.Tasks().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeSilverCard,
				Attributes: &proto.SkypassRewardAttributes{
					TokenIDs: []uint64{card1.ID},
				},
				Season: season,
			}}

			cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
			cardIndex.EXPECT().GetCardByID(card1.ID).Return(card1)

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			require.Len(t, gainedRewards, 1)
			assert.Equal(t, proto.RewardType_CARD, gainedRewards[0].Type)
			assert.Equal(t, 1, int(gainedRewards[0].Card.Amount))
			assert.Equal(t, proto.ItemType_SW_SILVER_CARDS, gainedRewards[0].Card.Card.ItemType)

			_, payload, err := getMintSkypassSilverCardsTask(accountID)
			require.NoError(t, err)

			assert.Equal(t, accountID, payload.AccountID)
			require.Len(t, payload.CardAmounts, 1)
			assert.Equal(t, 100, int(payload.CardAmounts[cardTokenID1]))
			assert.Equal(t, reward.ID, payload.SkypassRewardID)

			feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
			require.NoError(t, err)
			assert.NotNil(t, feedEvent)
			assert.Contains(t, feedEvent.TokenIDs, cardTokenID1)
		})

		t.Run("random card when no attributes provided", func(t *testing.T) {
			// Setup
			{
				t.Cleanup(func() {
					err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)

					err = data.DB.Tasks().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeSilverCard,
				Amount:   3,
				Season:   season,
			}}

			cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
			cardIndex.EXPECT().GetRandomCard([]uint64{cardWithInvalidSeason.ID}).Return(card1)
			cardIndex.EXPECT().GetRandomCard([]uint64{cardWithInvalidSeason.ID}).Return(card2)
			cardIndex.EXPECT().GetRandomCard([]uint64{cardWithInvalidSeason.ID}).Return(card1)

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			require.Len(t, gainedRewards, 3)
			assert.Equal(t, proto.RewardType_CARD, gainedRewards[0].Type)
			assert.Equal(t, 1, int(gainedRewards[0].Card.Amount))
			assert.Equal(t, proto.ItemType_SW_SILVER_CARDS, gainedRewards[0].Card.Card.ItemType)

			_, payload, err := getMintSkypassSilverCardsTask(accountID)
			require.NoError(t, err)

			assert.Equal(t, accountID, payload.AccountID)
			require.Len(t, payload.CardAmounts, 2)
			assert.Equal(t, 200, int(payload.CardAmounts[cardTokenID1]))
			assert.Equal(t, 100, int(payload.CardAmounts[cardTokenID2]))
			assert.Equal(t, reward.ID, payload.SkypassRewardID)

			feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
			require.NoError(t, err)
			assert.NotNil(t, feedEvent)
			assert.Contains(t, feedEvent.TokenIDs, cardTokenID1)
			assert.Contains(t, feedEvent.TokenIDs, cardTokenID2)
		})

		t.Run("random card from set when the card set is provided", func(t *testing.T) {
			// Setup
			{
				t.Cleanup(func() {
					err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)

					err = data.DB.Tasks().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeSilverCard,
				Amount:   1,
				Attributes: &proto.SkypassRewardAttributes{
					CardSets: []*proto.CardSet{&cardSet},
				},
				Season: season,
			}}

			cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
			cardIndex.EXPECT().GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, []uint64{cardWithInvalidSeason.ID}).Return(card1)

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			require.Len(t, gainedRewards, 1)
			assert.Equal(t, proto.RewardType_CARD, gainedRewards[0].Type)
			assert.Equal(t, 1, int(gainedRewards[0].Card.Amount))

			_, payload, err := getMintSkypassSilverCardsTask(accountID)
			require.NoError(t, err)

			assert.Equal(t, accountID, payload.AccountID)
			require.Len(t, payload.CardAmounts, 1)
			assert.Equal(t, 100, int(payload.CardAmounts[cardTokenID1]))
			assert.Equal(t, reward.ID, payload.SkypassRewardID)

			feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
			require.NoError(t, err)
			assert.NotNil(t, feedEvent)
			assert.Contains(t, feedEvent.TokenIDs, cardTokenID1)
		})

		t.Run("random card not being from set when the excluded card set is provided", func(t *testing.T) {
			cardIDsInTheSet := []uint64{1, 2}

			// Setup
			{
				t.Cleanup(func() {
					err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)

					err = data.DB.Tasks().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &typeSilverCard,
				Amount:   1,
				Attributes: &proto.SkypassRewardAttributes{
					CardSetsExcluded: []*proto.CardSet{&cardSet},
				},
				Season: season,
			}}

			cardIndex.EXPECT().CardIDsSeasonInvalid(season).Return([]uint64{cardWithInvalidSeason.ID})
			cardIndex.EXPECT().CardIDsByCardSets(&cardSet).Return(cardIDsInTheSet)
			cardIndex.EXPECT().GetRandomCard(append(cardIDsInTheSet, cardWithInvalidSeason.ID)).Return(card1)

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			require.Len(t, gainedRewards, 1)
			assert.Equal(t, proto.RewardType_CARD, gainedRewards[0].Type)
			assert.Equal(t, 1, int(gainedRewards[0].Card.Amount))

			_, payload, err := getMintSkypassSilverCardsTask(accountID)
			require.NoError(t, err)

			assert.Equal(t, accountID, payload.AccountID)
			require.Len(t, payload.CardAmounts, 1)
			assert.Equal(t, 100, int(payload.CardAmounts[cardTokenID1]))
			assert.Equal(t, reward.ID, payload.SkypassRewardID)

			feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
			require.NoError(t, err)
			assert.NotNil(t, feedEvent)
			assert.Contains(t, feedEvent.TokenIDs, cardTokenID1)
		})
	})

	t.Run("card back", func(t *testing.T) {
		typeCardBack := proto.ItemType_SW_CARD_BACKS

		cardBackID1 := uint64(1)
		cardBackID2 := uint64(2)
		cardBackTokenID1 := data.ItemTypeAndID2SWTokenID(typeCardBack, cardBackID1)
		cardBackTokenID2 := data.ItemTypeAndID2SWTokenID(typeCardBack, cardBackID2)

		// Setup
		{
			t.Cleanup(func() {
				err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)

				err = data.DB.Tasks().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		t.Run("specific card back when token IDs provided", func(t *testing.T) {
			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ID:       10,
				ItemType: &typeCardBack,
				Attributes: &proto.SkypassRewardAttributes{
					TokenIDs: []uint64{cardBackID1, cardBackID2},
				},
			}}

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			assert.Len(t, gainedRewards, 1)
			assert.Equal(t, proto.RewardType_CARD_BACK, gainedRewards[0].Type)

			_, payload, err := getMintCardBackRewardsTask(accountID)
			require.NoError(t, err)

			assert.Equal(t, accountID, payload.AccountID)
			require.Len(t, payload.CardBackAmounts, 2)
			assert.Equal(t, 100, int(payload.CardBackAmounts[cardBackTokenID1]))
			assert.Equal(t, 100, int(payload.CardBackAmounts[cardBackTokenID2]))
			assert.Equal(t, reward.ID, payload.SkypassRewardID)

			feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
			require.NoError(t, err)
			assert.NotNil(t, feedEvent)
			assert.Contains(t, feedEvent.TokenIDs, cardBackTokenID1)
			assert.Contains(t, feedEvent.TokenIDs, cardBackTokenID2)
		})
	})

	t.Run("title", func(t *testing.T) {
		typeTitle := proto.ItemType_SW_TITLES

		titleID1 := uint64(1)
		titleID2 := uint64(2)
		titleTokenID1 := data.ItemTypeAndID2SWTokenID(typeTitle, titleID1)
		titleTokenID2 := data.ItemTypeAndID2SWTokenID(typeTitle, titleID2)

		// Setup
		{

		}

		t.Run("specific title when token IDs provided", func(t *testing.T) {
			reward := data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ID:       10,
				ItemType: &typeTitle,
				Attributes: &proto.SkypassRewardAttributes{
					TokenIDs: []uint64{titleID1, titleID2},
				},
			}}

			gainedRewards, err := rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, &reward)
			require.NoError(t, err)

			assert.Len(t, gainedRewards, 1)
			assert.Equal(t, proto.RewardType_TITLE, gainedRewards[0].Type)

			items, err := data.DB.Items(data.DB.Session).FindAccountItems(accountID, typeTitle)
			require.NoError(t, err)
			require.Len(t, items, 2)

			feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": proto.FeedEventType_REWARD})
			require.NoError(t, err)
			assert.NotNil(t, feedEvent)
			assert.Contains(t, feedEvent.TokenIDs, titleTokenID1)
			assert.Contains(t, feedEvent.TokenIDs, titleTokenID2)
		})
	})
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

	var cardIDs []uint64

	for _, card := range cards {
		cardIDs = append(cardIDs, card.ID)
	}

	return cardIDs
}

func checkGainedBaseCard(t *testing.T, accountID proto.AccountID, gainedReward *proto.Reward) {
	assert.Equal(t, proto.RewardType_CARD, gainedReward.Type)
	assert.Equal(t, 1, int(gainedReward.Card.Amount))

	item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_BASE_CARDS, gainedReward.Card.Card.ID)
	require.NoError(t, err)
	assert.NotNil(t, item)
}

func getMintSkypassStickersTask(accountID proto.AccountID) (*data.Task, *jobqueue.MintSkypassStickersTask, error) {
	var task *data.Task

	err := data.DB.Tasks().Find(db.Cond{
		"account_id": accountID,
		"queue":      jobqueue.MintSkypassStickersQueue,
	}).One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var payload *jobqueue.MintSkypassStickersTask

	err = json.Unmarshal(task.Payload, &payload)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, payload, nil
}

func getMintSkypassSilverCardsTask(accountID proto.AccountID) (*data.Task, *jobqueue.MintSkypassSilverCardsTask, error) {
	var task *data.Task

	err := data.DB.Tasks().Find(db.Cond{
		"account_id": accountID,
		"queue":      jobqueue.MintSkypassSilverCardsQueue,
	}).One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var payload *jobqueue.MintSkypassSilverCardsTask

	err = json.Unmarshal(task.Payload, &payload)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, payload, nil
}

func getMintCardBackRewardsTask(accountID proto.AccountID) (*data.Task, *jobqueue.MintCardBackRewardsTask, error) {
	var task *data.Task

	err := data.DB.Tasks().Find(db.Cond{
		"account_id": accountID,
		"queue":      jobqueue.MintCardBackRewardsQueue,
	}).One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var payload *jobqueue.MintCardBackRewardsTask

	err = json.Unmarshal(task.Payload, &payload)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, payload, nil
}
