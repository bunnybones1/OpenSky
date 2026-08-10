package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestMatch(t *testing.T) {
	id := uint64(123)
	salt := "abc"
	replayID := "2bf2133bc030b43e3c26b415717ca20f713df2b0"

	t.Run("generate replay ID", func(t *testing.T) {
		match := data.NewMatch(&proto.Match{
			ID: id,
		})

		match.GenerateReplayID(salt)

		assert.Equal(t, replayID, match.ReplayID)
	})

	t.Run("is replay ID valid", func(t *testing.T) {
		t.Run("success", func(t *testing.T) {
			match := data.NewMatch(&proto.Match{
				ID: id,
			})

			result := match.IsReplayIDValid(salt, replayID)

			assert.True(t, result)
		})

		t.Run("failure", func(t *testing.T) {
			match := data.NewMatch(&proto.Match{
				ID: id,
			})

			result := match.IsReplayIDValid(salt, "bad replay ID")

			assert.False(t, result)
		})
	})

	t.Run("is ranked", func(t *testing.T) {
		t.Run("yes", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_RANKED_CONSTRUCTED,
				proto.GameMode_RANKED_DISCOVERY,
			}

			for _, mode := range modes {
				match := data.NewMatch(&proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				})

				result := match.IsRanked()

				assert.True(t, result)
			}
		})

		t.Run("no", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_CONQUEST_CONSTRUCTED,
				proto.GameMode_CONQUEST_DISCOVERY,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
				proto.GameMode_CHALLENGE_DISCOVERY,
			}

			for _, mode := range modes {
				match := data.NewMatch(&proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				})

				result := match.IsRanked()

				assert.False(t, result)
			}
		})
	})

	t.Run("is conquest", func(t *testing.T) {
		t.Run("yes", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_CONQUEST_CONSTRUCTED,
				proto.GameMode_CONQUEST_DISCOVERY,
			}

			for _, mode := range modes {
				match := data.NewMatch(&proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				})

				result := match.IsConquest()

				assert.True(t, result)
			}
		})

		t.Run("no", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_RANKED_CONSTRUCTED,
				proto.GameMode_RANKED_DISCOVERY,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
				proto.GameMode_CHALLENGE_DISCOVERY,
			}

			for _, mode := range modes {
				match := data.NewMatch(&proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				})

				result := match.IsConquest()

				assert.False(t, result)
			}
		})
	})

	t.Run("is challenge", func(t *testing.T) {
		t.Run("yes", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_CHALLENGE_CONSTRUCTED,
				proto.GameMode_CHALLENGE_DISCOVERY,
			}

			for _, mode := range modes {
				match := data.NewMatch(&proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				})

				result := match.IsChallenge()

				assert.True(t, result)
			}
		})

		t.Run("no", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_RANKED_CONSTRUCTED,
				proto.GameMode_RANKED_DISCOVERY,
				proto.GameMode_CONQUEST_CONSTRUCTED,
				proto.GameMode_CONQUEST_DISCOVERY,
			}

			for _, mode := range modes {
				match := data.NewMatch(&proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				})

				result := match.IsChallenge()

				assert.False(t, result)
			}
		})
	})
}
