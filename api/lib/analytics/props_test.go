package analytics_test

import (
	"testing"

	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/stretchr/testify/assert"
)

func TestValues(t *testing.T) {
	props := analytics.NewProps()

	props.Set("a", "a")
	assert.Equal(t, 1, len(props.Values))
	assert.Equal(t, 0, len(props.Device))

	props.Set("b", 1)
	assert.Equal(t, 2, len(props.Values))
	assert.Equal(t, 0, len(props.Device))

	props = props.Set("c", 1)
	assert.Equal(t, 3, len(props.Values))
	assert.Equal(t, 0, len(props.Device))

	assert.NotZero(t, props.Values["a"])
	assert.NotZero(t, props.Values["b"])
	assert.NotZero(t, props.Values["c"])
}

func TestDevice(t *testing.T) {
	props := analytics.NewProps()

	countryCode := "MX"
	environmentOS := "Linux"

	props.SetDevice(&proto.DeviceProperties{
		CountryCode:   &countryCode,
		EnvironmentOS: &environmentOS,
	})

	assert.Equal(t, 0, len(props.Values))
	assert.Equal(t, 2, len(props.Device))
}
