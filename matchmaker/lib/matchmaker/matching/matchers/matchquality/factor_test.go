package matchquality_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality"
)

func TestFactor(t *testing.T) {
	factor := matchquality.NewFactor("foo", 1, 2, 3)

	assert.Equal(t, "foo: 3", factor.String())
	assert.Equal(t, float64(1), factor.Scaler())
	assert.Equal(t, float64(2), factor.Exponent())
	assert.Equal(t, float64(3), factor.Value())
}
