package deckstring_test

import (
	"testing"

	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/stretchr/testify/assert"
)

// Testing functions without verification on backend,
// just pure encoding/decoding

func TestDeckStringEncoding(t *testing.T) {

	// Encoding/Decoding test
	{
		cardIDs := []uint64{1, 2, 3, 4, 5}
		expectedDeckString := "SWxCCC024G15hQdLMHY3H"

		ds, err := deckstring.Encode(cardIDs, "CCC")
		assert.NoError(t, err)
		assert.Equal(t, expectedDeckString, ds)

		decodedIDs, _, ver, err := deckstring.Decode(ds)
		assert.NoError(t, err)
		assert.Equal(t, cardIDs, decodedIDs)
		assert.Equal(t, deckstring.VERSION, ver)

		//
		// other cases
		//

		// valid deck, different order, lets make sure it encodes to the same
		ds, err = deckstring.Encode([]uint64{5, 2, 3, 4, 1}, "CCC")
		assert.NoError(t, err)
		assert.Equal(t, expectedDeckString, ds)

		// additional num, should be diff
		ds, err = deckstring.Encode([]uint64{1, 2, 3, 4, 5, 6}, "CCC")
		assert.NoError(t, err)
		assert.NotEqual(t, expectedDeckString, ds)

		// invalid string
		_, _, _, err = deckstring.Decode("SWxCCCVVaaaaaaaaa")
		assert.Error(t, err)
	}
}
