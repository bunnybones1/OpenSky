package matchhandlers_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/matchmaker/lib/director/matchhandlers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPlayerShuffler(t *testing.T) {
	p1 := playergen.MustNew()
	p2 := playergen.MustNew()
	p3 := playergen.MustNew()

	shuffler := matchhandlers.NewPlayerShuffler()

	players := []*player.Player{p1, p2, p3}

	assert.Eventually(t, func() bool {
		shuffled := shuffler.Shuffle(players)

		for i, p := range players {
			if p == shuffled[i] {
				return false
			}
		}

		return true
	}, time.Minute, time.Millisecond)
}
