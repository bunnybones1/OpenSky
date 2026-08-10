package matchvalidators

import "github.com/horizon-games/OpenSky/matchmaker/lib/player"

type SessionValidator struct {
}

func NewSessionValidator() *SessionValidator {
	return &SessionValidator{}
}

func (v *SessionValidator) IsValid(p1, p2 *player.Player) (bool, error) {
	if p1.SessionID != p2.SessionID {
		return false, nil
	}

	return true, nil
}
