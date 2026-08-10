package matchvalidators

import "github.com/horizon-games/OpenSky/matchmaker/lib/player"

type GameModeCriteriaValidator struct {
	gameModeCriteriaList []GameModeCriteria
}

func NewGameModeCriteriaValidator(gameModeCriteriaList ...GameModeCriteria) *GameModeCriteriaValidator {
	return &GameModeCriteriaValidator{
		gameModeCriteriaList: gameModeCriteriaList,
	}
}

func (v *GameModeCriteriaValidator) IsValid(p1, p2 *player.Player) (bool, error) {
	for i := 0; i < len(v.gameModeCriteriaList); i++ {
		criteria := v.gameModeCriteriaList[i]

		if criteria.IsAllowed(p1, p2) {
			return true, nil
		}
	}

	return false, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/game_mode_criteria.go -package mock . GameModeCriteria
type GameModeCriteria interface {
	IsAllowed(*player.Player, *player.Player) bool
}
