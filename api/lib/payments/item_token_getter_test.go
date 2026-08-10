package payments_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/payments"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestItemTokenGetterImpl(t *testing.T) {
	getter := payments.NewItemTokenGetterImpl()

	t.Run("gets conquest ticket token", func(t *testing.T) {
		tokenID, err := getter.GetToken(proto.ItemType_SW_CONQUEST_TICKET)
		require.NoError(t, err)
		require.Equal(t, data.ConquestTicketTokenID, tokenID)
	})

	t.Run("gets skypass token based on current season", func(t *testing.T) {
		tokenID, err := getter.GetToken(proto.ItemType_SW_SKYPASS)
		require.NoError(t, err)
		require.NotZero(t, tokenID)

		itemType, itemID, err := data.SWTokenID2TypeAndItemID(tokenID)
		require.NoError(t, err)
		assert.Equal(t, proto.ItemType_SW_SKYPASS, itemType)
		assert.Equal(t, data.CurrentSeason(), uint16(itemID))
	})

	t.Run("fails when item type is not supported", func(t *testing.T) {
		tokenID, err := getter.GetToken(proto.ItemType_UNKNOWN)
		require.ErrorContains(t, err, "unsupported")
		require.Zero(t, tokenID)
	})
}
