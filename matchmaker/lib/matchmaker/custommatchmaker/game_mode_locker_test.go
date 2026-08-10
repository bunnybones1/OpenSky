package custommatchmaker_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
)

func TestGameModeLocker(t *testing.T) {
	locker := lock.NewMemLock()

	gameModeLocker := custommatchmaker.NewGameModeLocker(locker)

	t.Run("provide unique locker per game mode", func(t *testing.T) {
		locker1 := gameModeLocker.Locker(proto.GameMode_RANKED_CONSTRUCTED)
		require.NotNil(t, locker1)

		locker2 := gameModeLocker.Locker(proto.GameMode_RANKED_CONSTRUCTED)
		require.NotNil(t, locker2)

		assert.Same(t, locker1, locker2)

		locker3 := gameModeLocker.Locker(proto.GameMode_RANKED_DISCOVERY)
		require.NotNil(t, locker3)

		assert.NotSame(t, locker1, locker3)
	})
}
