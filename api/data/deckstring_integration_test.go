//go:build integration

package data_test

import (
	"math/rand"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestDeckStringEncoding(t *testing.T) {
	// CardIndex should be already synced when integration tests boot up.
	assert.NotEmpty(t, data.CardIndex.AllCards())

	// Encoding/Decoding test
	{
		cardIDs := getDeckForClass(proto.CardClass_INT, data.SinglePrismDeckSize)

		ds, err := data.EncodeDeckString(cardIDs, proto.DeckClass_INT)
		assert.NoError(t, err)
		assert.Equal(t, "SWx", ds[:3])
		assert.Equal(t, proto.DeckClass_INT.String(), ds[3:6])
		expectedDeckString := ds

		decodedIDs, _, _, err := data.DecodeDeckString(ds)
		assert.NoError(t, err)
		assert.Equal(t, cardIDs, decodedIDs)

		//
		// other cases
		//

		// valid deck, different order, lets make sure it encodes to the same
		cardIDsShuffled := cardIDs
		rand.Shuffle(len(cardIDsShuffled), func(i, j int) {
			cardIDsShuffled[i], cardIDsShuffled[j] = cardIDsShuffled[j], cardIDsShuffled[i]
		})
		ds, err = data.EncodeDeckString(cardIDsShuffled, proto.DeckClass_INT)
		assert.NoError(t, err)
		assert.Equal(t, expectedDeckString, ds)

		// invalid string
		_, _, _, err = data.DecodeDeckString("SWxSTRVVaaaaaaaaa")
		assert.Error(t, err)

		// encode with card that doesnt exist..
		cardIDsShuffled[0] = 9999999
		_, err = data.EncodeDeckString(cardIDsShuffled, proto.DeckClass_INT)
		assert.Error(t, err)
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

	var cardIDs []uint64

	for _, card := range cards {
		cardIDs = append(cardIDs, card.ID)
	}

	return cardIDs
}
