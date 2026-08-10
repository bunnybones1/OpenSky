//go:build integration

package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	_ "github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
)

func TestSettings(t *testing.T) {
	t.Run("conquest v2 pool", func(t *testing.T) {
		pool1 := &data.SettingsConquestV2Pool{
			PoolCeiling:           10,
			PoolFloor:             1,
			TopWeightUnitPrice:    1,
			BottomWeightUnitPrice: 0.9,
		}

		err := data.DB.Settings(nil).SaveConquestV2Pool(pool1)
		require.NoError(t, err)

		result, err := data.DB.Settings(nil).FindConquestV2Pool()
		require.NoError(t, err)

		assert.Equal(t, pool1.PoolCeiling, result.PoolCeiling)
		assert.Equal(t, pool1.PoolFloor, result.PoolFloor)
		assert.Equal(t, pool1.TopWeightUnitPrice, result.TopWeightUnitPrice)
		assert.Equal(t, pool1.BottomWeightUnitPrice, result.BottomWeightUnitPrice)

		pool2 := &data.SettingsConquestV2Pool{
			PoolCeiling:           20,
			PoolFloor:             2,
			TopWeightUnitPrice:    1.1,
			BottomWeightUnitPrice: 0.8,
		}

		err = data.DB.Settings(nil).SaveConquestV2Pool(pool2)
		require.NoError(t, err)

		result, err = data.DB.Settings(nil).FindConquestV2Pool()
		require.NoError(t, err)

		assert.Equal(t, pool2.PoolCeiling, result.PoolCeiling)
		assert.Equal(t, pool2.PoolFloor, result.PoolFloor)
		assert.Equal(t, pool2.TopWeightUnitPrice, result.TopWeightUnitPrice)
		assert.Equal(t, pool2.BottomWeightUnitPrice, result.BottomWeightUnitPrice)

		t.Cleanup(func() {
			err := data.DB.Settings(nil).Find(db.Cond{"key": data.SettingKeyConquestV2Pool}).Delete()
			require.NoError(t, err)
		})
	})
}
