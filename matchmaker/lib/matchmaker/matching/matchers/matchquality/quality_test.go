package matchquality_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality"
)

func TestQuality(t *testing.T) {
	factor1 := matchquality.NewFactor("foo", 1, 1, 1)
	factor2 := matchquality.NewFactor("bar", 2, 2, 2)

	quality := matchquality.Quality(factor1, factor2)

	assert.InDelta(t, 3.684, quality, 0.001)
}
