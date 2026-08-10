package gamemodecriterias

import "github.com/horizon-games/OpenSky/matchmaker/lib/player"

type ChallengeCriteria struct {
}

func NewChallengeCriteria() *ChallengeCriteria {
	return &ChallengeCriteria{}
}

func (c *ChallengeCriteria) IsAllowed(p1, p2 *player.Player) bool {
	if !p1.IsChallengeMatch() && !p2.IsChallengeMatch() {
		return false
	}

	if p1.Mode != p2.Mode {
		return false
	}

	if p1.SessionID == "" || p2.SessionID == "" {
		return false
	}

	if p1.SessionID != p2.SessionID {
		return false
	}

	return true
}
