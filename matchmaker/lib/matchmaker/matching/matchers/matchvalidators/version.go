package matchvalidators

import "github.com/horizon-games/OpenSky/matchmaker/lib/player"

type VersionValidator struct {
}

func NewVersionValidator() *VersionValidator {
	return &VersionValidator{}
}

func (v *VersionValidator) IsValid(p1, p2 *player.Player) (bool, error) {
	if p1.ClientVersionHash != p2.ClientVersionHash {
		return false, nil
	}

	return true, nil
}
