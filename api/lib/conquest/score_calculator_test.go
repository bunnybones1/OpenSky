package conquest_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/conquest"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestScoreCalculator(t *testing.T) {
	scoreCalculare := conquest.NewScoreCalculator()

	accountID1 := apitest.RandomAccountID()
	accountID2 := apitest.RandomAccountID()

	t.Run("adds plus one when player is a winner", func(t *testing.T) {
		winner1 := uint(1)
		winner2 := uint(2)
		matches := []*data.Match{
			{Match: &proto.Match{
				WinningPlayer: &winner1,
				Player1ID:     accountID1,
				Player2ID:     accountID2,
			}},
			{Match: &proto.Match{
				WinningPlayer: &winner2,
				Player1ID:     accountID2,
				Player2ID:     accountID1,
			}},
		}

		for _, match := range matches {
			result := scoreCalculare.FromPastMatches([]*data.Match{match}, accountID1)

			assert.Equal(t, int32(1), result)
		}
	})

	t.Run("adds minus one when player is a loser", func(t *testing.T) {
		winner1 := uint(1)
		winner2 := uint(2)
		matches := []*data.Match{
			{Match: &proto.Match{
				WinningPlayer: &winner2,
				Player1ID:     accountID1,
				Player2ID:     accountID2,
			}},
			{Match: &proto.Match{
				WinningPlayer: &winner1,
				Player1ID:     accountID2,
				Player2ID:     accountID1,
			}},
		}

		for _, match := range matches {
			result := scoreCalculare.FromPastMatches([]*data.Match{match}, accountID1)

			assert.Equal(t, int32(-1), result)
		}
	})
}
