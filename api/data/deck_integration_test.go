//go:build integration

package data_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/metrics"
	"github.com/horizon-games/OpenSky/api/lib/skypass"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestCreateStarterDecks(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestCreateStarterDecks")
			require.NoError(t, err)
		}
	}

	err := data.CreateStarterDecks(data.DB, accountID)
	require.NoError(t, err)

	var decks []*data.Deck

	err = data.DB.Decks().Find(db.Cond{"account_id": accountID}).All(&decks)
	require.NoError(t, err)

	starterDecks := data.GetStarterDecks()

	assert.Greater(t, len(decks), 0)
	assert.Len(t, decks, len(starterDecks))

	for _, starterDeck := range starterDecks {
		var found bool

		for _, deck := range decks {
			if deck.Class == starterDeck.Class {
				found = true

				if deck.Class == proto.DeckClass_STR {
					assert.Equal(t, proto.DeckType_UNLOCKED_STARTER, deck.DeckType)
					assert.True(t, deck.IsNew)

					var cardItems []*data.Item

					err = data.DB.Items().Find(db.Cond{
						"account_id": accountID,
						"item_type":  proto.ItemType_SW_BASE_CARDS,
						"token_id":   db.AnyOf(deck.CardIDs),
					}).All(&cardItems)
					require.NoError(t, err)
					assert.Equal(t, data.SinglePrismDeckSize, len(cardItems))

					for _, card := range cardItems {
						assert.False(t, *card.IsNew)
					}
				} else {
					assert.Equal(t, proto.DeckType_LOCKED_STARTER, deck.DeckType)
					assert.False(t, deck.IsNew)

					count, err := data.DB.Items().Find(db.Cond{
						"account_id": accountID,
						"item_type":  proto.ItemType_SW_BASE_CARDS,
						"token_id":   db.AnyOf(deck.CardIDs),
					}).Count()
					require.NoError(t, err)
					assert.Zero(t, count)
				}
			}
		}

		assert.True(t, found)
	}

	// It is idempotent
	err = data.CreateStarterDecks(data.DB, accountID)
	require.NoError(t, err)

	err = data.DB.Decks().Find(db.Cond{"account_id": accountID}).All(&decks)
	require.NoError(t, err)

	assert.Len(t, decks, len(starterDecks))
}

func TestUnlockStarterDecksByLevel(t *testing.T) {
	var accountID proto.AccountID

	var targetLevels []int

	starterDecks := data.GetStarterDecks()

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestUnlockStarterDecksByLevel")
			require.NoError(t, err)
		}

		// Decks
		{
			err := data.CreateStarterDecks(data.DB, accountID)
			require.NoError(t, err)
		}

		// Hero rewards
		{
			for i, deck := range starterDecks {
				if deck.Class == proto.DeckClass_STR {
					continue
				}

				heroItemType := proto.ItemType_SW_HERO
				tier := proto.SkypassTier_FREE

				level := i + 1

				targetLevels = append(targetLevels, level)

				reward := &data.SkypassReward{SkypassReward: &proto.SkypassReward{
					ItemType: &heroItemType,
					Season:   data.CurrentSeason(),
					Level:    uint16(level),
					Tier:     &tier,
					Attributes: &proto.SkypassRewardAttributes{
						TokenIDs: []uint64{uint64(data.DeckClassHero(deck.Class))},
					},
				}}

				err := data.DB.Save(reward)
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.SkypassRewards().Truncate()
				require.NoError(t, err)
			})
		}
	}

	for _, tt := range targetLevels {
		levelUpHeroes, err := data.ListHeroesInLevel(data.DB.Session, uint16(tt))
		require.NoError(t, err)
		require.Len(t, levelUpHeroes, 1)

		deckClass := data.HeroDeckClass(levelUpHeroes[0])

		t.Run(fmt.Sprintf("unlocks %s", deckClass), func(t *testing.T) {
			deck, err := data.DB.Decks().FindOne(db.Cond{"account_id": accountID, "class": deckClass})
			require.NoError(t, err)
			assert.Equal(t, proto.DeckType_LOCKED_STARTER, deck.DeckType)

			events, rewards, err := data.UnlockStarterDecksByLevel(data.DB, accountID, tt)
			require.NoError(t, err)

			require.Len(t, events, 1)
			assert.Equal(t, accountID, events[0].AccountID)
			assert.Equal(t, proto.FeedEventType_STARTED_DECK_UNLOCK, events[0].Type)
			assert.Len(t, events[0].Heroes, 1)

			require.Len(t, rewards, 1)
			assert.Equal(t, proto.RewardType_DECK, rewards[0].Type)
			assert.Equal(t, deckClass, rewards[0].Deck.DeckClass)
			assert.Len(t, rewards[0].Deck.TokenIds, data.SinglePrismDeckSize)

			deck, err = data.DB.Decks().FindOne(db.Cond{"account_id": accountID, "class": deckClass})
			require.NoError(t, err)
			assert.Equal(t, proto.DeckType_UNLOCKED_STARTER, deck.DeckType)

			var cardItems []*data.Item

			err = data.DB.Items().Find(db.Cond{
				"account_id": accountID,
				"item_type":  proto.ItemType_SW_BASE_CARDS,
				"token_id":   db.AnyOf(deck.CardIDs),
			}).All(&cardItems)
			require.NoError(t, err)
			assert.Equal(t, data.SinglePrismDeckSize, len(cardItems))

			for _, card := range cardItems {
				assert.False(t, *card.IsNew)
			}
		})
	}
}

func TestUnlockStarterDeckByDeckClass(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestUnlockStarterDeckByDeckClass")
			require.NoError(t, err)
		}

		// Decks
		{
			err := data.CreateStarterDecks(data.DB, accountID)
			require.NoError(t, err)
		}
	}

	starterDecks := data.GetStarterDecks()

	for _, starterDeck := range starterDecks {
		if starterDeck.Class == proto.DeckClass_STR {
			// STR is unlocked on account creation.
			continue
		}

		t.Run(fmt.Sprintf("unlocks %s", starterDeck.Class), func(t *testing.T) {
			deck, err := data.DB.Decks().FindOne(db.Cond{"account_id": accountID, "class": starterDeck.Class})
			require.NoError(t, err)
			assert.Equal(t, proto.DeckType_LOCKED_STARTER, deck.DeckType)

			events, rewards, err := data.UnlockStarterDeckByDeckClass(data.DB, accountID, starterDeck.Class)
			require.NoError(t, err)

			require.Len(t, events, 1)
			assert.Equal(t, accountID, events[0].AccountID)
			assert.Equal(t, proto.FeedEventType_STARTED_DECK_UNLOCK, events[0].Type)
			assert.Len(t, events[0].Heroes, 1)

			require.Len(t, rewards, 1)
			assert.Equal(t, proto.RewardType_DECK, rewards[0].Type)
			assert.Equal(t, starterDeck.Class, rewards[0].Deck.DeckClass)
			assert.Len(t, rewards[0].Deck.TokenIds, data.SinglePrismDeckSize)

			deck, err = data.DB.Decks().FindOne(db.Cond{"account_id": accountID, "class": starterDeck.Class})
			require.NoError(t, err)
			assert.Equal(t, proto.DeckType_UNLOCKED_STARTER, deck.DeckType)

			var cardItems []*data.Item

			err = data.DB.Items().Find(db.Cond{
				"account_id": accountID,
				"item_type":  proto.ItemType_SW_BASE_CARDS,
				"token_id":   db.AnyOf(deck.CardIDs),
			}).All(&cardItems)
			require.NoError(t, err)
			assert.Equal(t, data.SinglePrismDeckSize, len(cardItems))

			for _, card := range cardItems {
				assert.False(t, *card.IsNew)
			}
		})
	}
}

func TestIsDeckClassUnlocked(t *testing.T) {
	var accountID proto.AccountID

	var unlockedDeckClassAda, unlockedDeckClassAnother, lockedDeckClass proto.DeckClass

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestIsDeckClassUnlocked")
			require.NoError(t, err)
		}

		// Heroes
		{
			err := data.CreateStarterDecks(data.DB, accountID)
			require.NoError(t, err)

			unlockedDeckClassAda = data.HeroDeckClass(proto.Hero_ADA)

			anotherHero := proto.Hero_SAMYA
			unlockedDeckClassAnother = data.HeroDeckClass(anotherHero)
			heroItemType := proto.ItemType_SW_HERO
			tier := proto.SkypassTier_FREE
			reward := &data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &heroItemType,
				Season:   1,
				Tier:     &tier,
				Attributes: &proto.SkypassRewardAttributes{
					TokenIDs: []uint64{uint64(anotherHero)},
				},
			}}
			require.NoError(t, reward.Validate())

			rewardApplier := skypass.NewRewardApplier(nil, metrics.NewPrometheusCollector())
			_, err = rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, reward)
			require.NoError(t, err)

			lockedDeckClass = data.HeroDeckClass(proto.Hero_ARI)
		}
	}

	t.Run("returns true when the deck class is unlocked", func(t *testing.T) {
		isUnlocked, err := data.IsDeckClassUnlocked(data.DB.Session, accountID, unlockedDeckClassAda)
		require.NoError(t, err)
		assert.True(t, isUnlocked)

		isUnlocked, err = data.IsDeckClassUnlocked(data.DB.Session, accountID, unlockedDeckClassAnother)
		require.NoError(t, err)
		assert.True(t, isUnlocked)
	})

	t.Run("returns false when the deck class is locked", func(t *testing.T) {
		isUnlocked, err := data.IsDeckClassUnlocked(data.DB.Session, accountID, lockedDeckClass)
		require.NoError(t, err)
		assert.False(t, isUnlocked)
	})
}

func TestGetStarterDecks(t *testing.T) {
	expectedDeckClasses := []proto.DeckClass{
		proto.DeckClass_STR,
		proto.DeckClass_AGY,
		proto.DeckClass_WIS,
		proto.DeckClass_HRT,
		proto.DeckClass_INT,
	}

	starterDecks := data.GetStarterDecks()

	for _, expectedDeckClass := range expectedDeckClasses {
		var found bool

		for _, deck := range starterDecks {
			if deck.Class == expectedDeckClass {
				found = true

				if deck.Class == proto.DeckClass_STR {
					assert.Equal(t, proto.DeckType_UNLOCKED_STARTER, deck.DeckType)
				} else {
					assert.Equal(t, proto.DeckType_LOCKED_STARTER, deck.DeckType)
				}

				assert.Len(t, deck.CardIDs, data.SinglePrismDeckSize)

				var expectedDeckName string
				hero := data.DeckClassHero(deck.Class)
				switch hero {
				case proto.Hero_ADA:
					expectedDeckName = "Ada Starter"
				case proto.Hero_SAMYA:
					expectedDeckName = "Samya Starter"
				case proto.Hero_LOTUS:
					expectedDeckName = "Lotus Starter"
				case proto.Hero_BOURAN:
					expectedDeckName = "Bouran Starter"
				case proto.Hero_ARI:
					expectedDeckName = "Ari Starter"
				}

				assert.Equal(t, expectedDeckName, deck.Name)
			}
		}

		assert.True(t, found)
	}
}

func TestHasStarterDeck(t *testing.T) {
	expectedStarterDeckDeckClasses := []proto.DeckClass{
		proto.DeckClass_STR,
		proto.DeckClass_AGY,
		proto.DeckClass_WIS,
		proto.DeckClass_HRT,
		proto.DeckClass_INT,
	}

	for _, deckClass := range expectedStarterDeckDeckClasses {
		t.Run(fmt.Sprintf("%s has starter deck", deckClass), func(t *testing.T) {
			has := data.HasStarterDeck(deckClass)
			assert.True(t, has)
		})
	}
}
