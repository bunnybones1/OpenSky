package matchers

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type playerValidator struct {
	playerRepository PlayerRepository
	// chanceToUnban can have a value between 0.0 and 1.0 when 1.0 means 100%.
	chanceToUnban float32
}

// NewPlayerValidator initiates playerValidator when
// chanceToUnban can have a value between 0.0 and 1.0 when 1.0 means 100%.
func NewPlayerValidator(playerRepository PlayerRepository, chanceToUnban float32) *playerValidator {
	return &playerValidator{
		playerRepository: playerRepository,
		chanceToUnban:    chanceToUnban,
	}
}

func (v *playerValidator) IsValid(p *player.Player) (bool, error) {
	if p.ShadowBanned != nil && *p.ShadowBanned {
		now := time.Now()
		if now.Before(*p.ShadowBanUntil) {
			return false, nil
		}

		if rand.Float32() > v.chanceToUnban {
			return false, nil
		}

		p.ClearShadowBan()

		if err := v.playerRepository.Save(p); err != nil {
			return false, fmt.Errorf("save player: %w", err)
		}
	}

	playerStatus, err := v.playerRepository.GetStatus(p)
	if err != nil {
		return false, fmt.Errorf("get player status: %w", err)
	}

	if playerStatus != player.PlayerStatus_CONNECTED {
		return false, nil
	}

	return true, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_repository.go -package mock . PlayerRepository
type PlayerRepository interface {
	Save(*player.Player) error
	GetStatus(*player.Player) (player.PlayerStatus, error)
}
