package matchvalidators

import (
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type SameIPAddressValidator struct {
	challengeCriteria GameModeCriteria
	allowSameIPMatch  bool
}

func NewSameIPAddressValidator(cfg *config.Config, challengeCriteria GameModeCriteria) *SameIPAddressValidator {
	return &SameIPAddressValidator{
		challengeCriteria: challengeCriteria,
		allowSameIPMatch:  cfg.MatchMaker.AllowSameIPMatch,
	}
}

func (v *SameIPAddressValidator) IsValid(p1, p2 *player.Player) (bool, error) {
	if !v.allowSameIPMatch {
		if p1.IPAddress == p2.IPAddress && !v.challengeCriteria.IsAllowed(p1, p2) {
			return false, nil
		}
	}

	return true, nil
}
