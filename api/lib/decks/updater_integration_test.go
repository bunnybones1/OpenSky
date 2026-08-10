//go:build integration

package decks_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/decks"
	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestUpdater(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestUpdater")
			require.NoError(t, err)
		}

		// Decks
		{
			t.Cleanup(func() {
				err := data.DB.Decks().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}
	}

	name := "new name"
	art := "new art"

	updater := decks.NewUpdater(zerolog.Nop())

	t.Run("updates deck when UUID provided", func(t *testing.T) {
		var deck *data.Deck

		// Setup
		{
			// Decks
			{
				{
					cardIDs := []uint64{6}
					deckClass := proto.DeckClass_STR
					deckString, err := deckstring.Encode(cardIDs, deckClass.String())
					require.NoError(t, err)

					deck = &data.Deck{Deck: &proto.Deck{
						AccountID:  accountID,
						Name:       "foo",
						Class:      deckClass,
						DeckString: deckString,
						DeckType:   proto.DeckType_CUSTOM,
						IsNew:      true,
					}}

					err = data.DB.Save(deck)
					require.NoError(t, err)
				}
			}
		}

		cardIDs := append(deck.CardIDs, 3)

		deckString, err := deckstring.Encode(cardIDs, deck.Class.String())
		require.NoError(t, err)

		req := &proto.UpdateDeckRequest{
			UUID: &deck.UUID,
			Deck: &proto.UpdateDeckRequestDeck{
				DeckString: deckString,
				Name:       name,
				DeckClass:  &deck.Class,
				Art:        &art,
			},
		}

		resultDeck, err := updater.Update(data.DB.Session, accountID, req)
		require.NoError(t, err)
		require.NotNil(t, resultDeck)

		assert.Equal(t, deck.UUID, resultDeck.UUID)
		assert.Equal(t, proto.DeckType_CUSTOM, resultDeck.DeckType)
		assert.Equal(t, name, resultDeck.Name)
		assert.Equal(t, art, resultDeck.Art)
		assert.Equal(t, cardIDs, resultDeck.CardIDs)
		assert.False(t, resultDeck.IsNew)

		existingDeck, err := data.DB.Decks().FindOne(db.Cond{"uuid": deck.UUID})
		require.NoError(t, err)
		require.NotNil(t, existingDeck)

		assert.Equal(t, proto.DeckType_CUSTOM, existingDeck.DeckType)
		assert.Equal(t, name, existingDeck.Name)
		assert.Equal(t, art, existingDeck.Art)
		assert.Equal(t, cardIDs, existingDeck.CardIDs)
		assert.False(t, existingDeck.IsNew)
	})

	t.Run("updates deck when deck string provided", func(t *testing.T) {
		var deck *data.Deck

		// Setup
		{
			// Decks
			{
				{
					cardIDs := []uint64{3}
					deckClass := proto.DeckClass_STR
					deckString, err := deckstring.Encode(cardIDs, deckClass.String())
					require.NoError(t, err)

					deck = &data.Deck{Deck: &proto.Deck{
						AccountID:  accountID,
						Name:       "foo",
						Class:      deckClass,
						DeckString: deckString,
						DeckType:   proto.DeckType_CUSTOM,
						IsNew:      true,
					}}

					err = data.DB.Save(deck)
					require.NoError(t, err)
				}
			}
		}

		cardIDs := append(deck.CardIDs, 2)

		deckString, err := deckstring.Encode(cardIDs, deck.Class.String())
		require.NoError(t, err)

		req := &proto.UpdateDeckRequest{
			DeckString: &deck.DeckString,
			Deck: &proto.UpdateDeckRequestDeck{
				DeckString: deckString,
				Name:       name,
				DeckClass:  &deck.Class,
				Art:        &art,
			},
		}

		resultDeck, err := updater.Update(data.DB.Session, accountID, req)
		require.NoError(t, err)
		require.NotNil(t, resultDeck)

		assert.Equal(t, deck.UUID, resultDeck.UUID)
		assert.Equal(t, proto.DeckType_CUSTOM, resultDeck.DeckType)
		assert.Equal(t, name, resultDeck.Name)
		assert.Equal(t, art, resultDeck.Art)
		assert.Equal(t, cardIDs, resultDeck.CardIDs)
		assert.False(t, resultDeck.IsNew)

		existingDeck, err := data.DB.Decks().FindOne(db.Cond{"uuid": deck.UUID})
		require.NoError(t, err)
		require.NotNil(t, existingDeck)

		assert.Equal(t, proto.DeckType_CUSTOM, existingDeck.DeckType)
		assert.Equal(t, name, existingDeck.Name)
		assert.Equal(t, art, existingDeck.Art)
		assert.Equal(t, cardIDs, existingDeck.CardIDs)
		assert.False(t, existingDeck.IsNew)
	})

	t.Run("starter decks", func(t *testing.T) {
		// Setup
		{
			// Decks
			{
				err := data.CreateStarterDecks(data.DB.Session, accountID)
				require.NoError(t, err)
			}
		}

		t.Run("updates when deck is unlocked", func(t *testing.T) {
			var deck *data.Deck

			// Setup
			{
				// Decks
				{
					var err error

					deck, err = data.DB.Decks().FindOne(db.Cond{"account_id": accountID, "deck_type": proto.DeckType_UNLOCKED_STARTER})
					require.NoError(t, err)

					assert.True(t, deck.IsNew)
				}
			}

			cardIDs := []uint64{2}
			cardIDs = append(cardIDs, deck.CardIDs[1:]...)

			deckString, err := deckstring.Encode(cardIDs, deck.Class.String())
			require.NoError(t, err)

			req := &proto.UpdateDeckRequest{
				UUID: &deck.UUID,
				Deck: &proto.UpdateDeckRequestDeck{
					DeckString: deckString,
					Name:       name,
					DeckClass:  &deck.Class,
					Art:        &art,
				},
			}

			resultDeck, err := updater.Update(data.DB.Session, accountID, req)
			require.NoError(t, err)
			require.NotNil(t, resultDeck)

			assert.Equal(t, deck.UUID, resultDeck.UUID)
			assert.Equal(t, proto.DeckType_UNLOCKED_STARTER, resultDeck.DeckType)
			assert.Equal(t, name, resultDeck.Name)
			assert.Equal(t, art, resultDeck.Art)
			assert.Equal(t, proto.U64JSONBArray(cardIDs), resultDeck.CardIDs)
			assert.False(t, resultDeck.IsNew)

			existingDeck, err := data.DB.Decks().FindOne(db.Cond{"uuid": deck.UUID})
			require.NoError(t, err)
			require.NotNil(t, existingDeck)

			assert.Equal(t, proto.DeckType_UNLOCKED_STARTER, existingDeck.DeckType)
			assert.Equal(t, name, existingDeck.Name)
			assert.Equal(t, art, existingDeck.Art)
			assert.Equal(t, proto.U64JSONBArray(cardIDs), existingDeck.CardIDs)
			assert.False(t, existingDeck.IsNew)
		})

		t.Run("fails when deck is locked", func(t *testing.T) {
			var deck *data.Deck

			// Setup
			{
				// Decks
				{
					var err error

					deck, err = data.DB.Decks().FindOne(db.Cond{"account_id": accountID, "deck_type": proto.DeckType_LOCKED_STARTER})
					require.NoError(t, err)
				}
			}

			req := &proto.UpdateDeckRequest{
				UUID: &deck.UUID,
				Deck: &proto.UpdateDeckRequestDeck{
					DeckString: deck.DeckString,
				},
			}

			resultDeck, err := updater.Update(data.DB.Session, accountID, req)
			require.ErrorContains(t, err, "deck not unlocked")
			require.Nil(t, resultDeck)
		})
	})

	t.Run("fails when deck does not exist", func(t *testing.T) {
		id := uuid.New().String()

		deckClass := proto.DeckClass_STR
		deckString, err := deckstring.Encode([]uint64{1}, deckClass.String())
		require.NoError(t, err)

		req := &proto.UpdateDeckRequest{
			UUID: &id,
			Deck: &proto.UpdateDeckRequestDeck{
				DeckString: deckString,
				Name:       name,
				DeckClass:  &deckClass,
				Art:        &art,
			},
		}

		resultDeck, err := updater.Update(data.DB.Session, accountID, req)
		require.ErrorContains(t, err, "deck does not exist")
		require.Nil(t, resultDeck)
	})

	t.Run("fails when neither uuid or deck string provided", func(t *testing.T) {
		deckClass := proto.DeckClass_STR
		deckString, err := deckstring.Encode([]uint64{1}, deckClass.String())
		require.NoError(t, err)

		req := &proto.UpdateDeckRequest{
			Deck: &proto.UpdateDeckRequestDeck{
				DeckString: deckString,
				Name:       name,
				DeckClass:  &deckClass,
				Art:        &art,
			},
		}

		resultDeck, err := updater.Update(data.DB.Session, accountID, req)
		require.ErrorContains(t, err, "missing argument uuid or deck string")
		require.Nil(t, resultDeck)
	})
}
