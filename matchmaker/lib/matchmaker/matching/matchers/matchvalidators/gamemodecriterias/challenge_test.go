package gamemodecriterias_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestChallengeCriteria(t *testing.T) {
	criteria := gamemodecriterias.NewChallengeCriteria()

	tests := []struct {
		name                     string
		p1GameMode, p2GameMode   proto.GameMode
		p1SessionID, p2SessionID string
		isAllowed                bool
	}{
		{
			name:        "players are in the same challenge and with the same session ID",
			p1GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p2GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p1SessionID: "foo",
			p2SessionID: "foo",
			isAllowed:   true,
		},
		{
			name:        "players dont have the same session ID",
			p1GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p2GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p1SessionID: "foo",
			p2SessionID: "bar",
			isAllowed:   false,
		},
		{
			name:        "player 1 does not have session ID",
			p1GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p2GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p2SessionID: "foo",
			isAllowed:   false,
		},
		{
			name:        "player 2 does not have session ID",
			p1GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p2GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p1SessionID: "foo",
			isAllowed:   false,
		},
		{
			name:        "players are not in the same mode",
			p1GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p2GameMode:  proto.GameMode_CHALLENGE_DISCOVERY,
			p1SessionID: "foo",
			p2SessionID: "foo",
			isAllowed:   false,
		},
		{
			name:        "player is not in challenge",
			p1GameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
			p2GameMode:  proto.GameMode_RANKED_CONSTRUCTED,
			p1SessionID: "foo",
			p2SessionID: "foo",
			isAllowed:   false,
		},
		{
			name:        "neither of players are in challenge",
			p1GameMode:  proto.GameMode_RANKED_CONSTRUCTED,
			p2GameMode:  proto.GameMode_RANKED_CONSTRUCTED,
			p1SessionID: "foo",
			p2SessionID: "foo",
			isAllowed:   false,
		},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("%t when %s", tt.isAllowed, tt.name), func(t *testing.T) {
			p1 := playergen.MustNew(
				playergen.WithMode(tt.p1GameMode),
				playergen.WithSessionID(tt.p1SessionID),
			)

			p2 := playergen.MustNew(
				playergen.WithMode(tt.p2GameMode),
				playergen.WithSessionID(tt.p2SessionID),
			)

			isAllowed := criteria.IsAllowed(p1, p2)
			assert.Equal(t, tt.isAllowed, isAllowed)
		})
	}
}
