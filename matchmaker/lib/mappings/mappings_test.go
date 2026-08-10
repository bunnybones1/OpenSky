package mappings_test

import (
	"testing"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/mappings"

	"github.com/stretchr/testify/assert"
)

func TestDeckClass(t *testing.T) {
	assert.Equal(t, proto.DeckClass_UNKNOWN_CLASS, mappings.DeckClassMap(proto.DeckClass_UNKNOWN_CLASS))
	assert.Equal(t, proto.DeckClass_UNKNOWN_CLASS, mappings.DeckClassMap())

	assert.Equal(t, proto.DeckClass_STR, mappings.DeckClassMap(proto.DeckClass_STR))
	assert.Equal(t, proto.DeckClass_HRT, mappings.DeckClassMap(proto.DeckClass_HRT))
	assert.Equal(t, proto.DeckClass_AGY, mappings.DeckClassMap(proto.DeckClass_AGY))
	assert.Equal(t, proto.DeckClass_INT, mappings.DeckClassMap(proto.DeckClass_INT))
	assert.Equal(t, proto.DeckClass_WIS, mappings.DeckClassMap(proto.DeckClass_WIS))

	assert.Equal(t, proto.DeckClass_STH, mappings.DeckClassMap(proto.DeckClass_STR, proto.DeckClass_HRT))
	assert.Equal(t, proto.DeckClass_STH, mappings.DeckClassMap(proto.DeckClass_HRT, proto.DeckClass_STR))
	assert.Equal(t, proto.DeckClass_STH, mappings.DeckClassMap(proto.DeckClass_HRT, proto.DeckClass_STR, proto.DeckClass_HRT))
	assert.Equal(t, proto.DeckClass_STH, mappings.DeckClassMap(proto.DeckClass_HRT, proto.DeckClass_STR, proto.DeckClass_HRT, proto.DeckClass_STR))

	assert.Equal(t, proto.DeckClass_STA, mappings.DeckClassMap(proto.DeckClass_STR, proto.DeckClass_AGY, proto.DeckClass_STR))

	assert.Equal(t, proto.DeckClass_HRA, mappings.DeckClassMap(proto.DeckClass_AGY, proto.DeckClass_HRT))

	assert.Equal(t, proto.DeckClass_HRA, mappings.DeckClassMap(proto.DeckClass_HRA))

	assert.Equal(t, proto.DeckClass_UNKNOWN_CLASS, mappings.DeckClassMap(proto.DeckClass_STR, proto.DeckClass_AGY, proto.DeckClass_WIS))
}

func TestDeckClassHero(t *testing.T) {
	assert.Equal(t, proto.Hero_UNKNOWN, mappings.DeckClassHero())
	assert.Equal(t, proto.Hero_ADA, mappings.DeckClassHero(proto.DeckClass_STR))
	assert.Equal(t, proto.Hero_ADA, mappings.DeckClassHero(proto.DeckClass_STR, proto.DeckClass_STR))
	assert.Equal(t, proto.Hero_SAMYA, mappings.DeckClassHero(proto.DeckClass_AGY))
	assert.Equal(t, proto.Hero_FOX, mappings.DeckClassHero(proto.DeckClass_STR, proto.DeckClass_AGY))
	assert.Equal(t, proto.Hero_FOX, mappings.DeckClassHero(proto.DeckClass_STR, proto.DeckClass_AGY, proto.DeckClass_STR))
	assert.Equal(t, proto.Hero_ZOEY, mappings.DeckClassHero(proto.DeckClass_AGY, proto.DeckClass_HRT))
	assert.Equal(t, proto.Hero_ZOEY, mappings.DeckClassHero(proto.DeckClass_HRT, proto.DeckClass_AGY))
	assert.Equal(t, proto.Hero_MIRA, mappings.DeckClassHero(proto.DeckClass_STR, proto.DeckClass_INT))
	assert.Equal(t, proto.Hero_UNKNOWN, mappings.DeckClassHero(proto.DeckClass_STR, proto.DeckClass_INT, proto.DeckClass_AGY))
}
