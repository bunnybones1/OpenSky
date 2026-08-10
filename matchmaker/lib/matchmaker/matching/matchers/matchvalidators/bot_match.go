package matchvalidators

import (
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type BotMatchValidator struct {
	botBypassWaitTimeChecksEnabled bool
}

func NewBotMatchValidator(cfg *config.Config) *BotMatchValidator {
	return &BotMatchValidator{
		botBypassWaitTimeChecksEnabled: cfg.Testing.PlayerBotBypassWaitTimeChecksEnabled,
	}
}

func (v *BotMatchValidator) IsValid(p1, p2 *player.Player) (bool, error) {
	if v.botBypassWaitTimeChecksEnabled {
		return true, nil
	}

	p := p1

	if p1.IsBot() {
		p = p2
	}

	if p.Rank() > proto.PlayerRank_APPRENTICE {
		return false, nil
	}

	var allowMatch bool

	waitTime := p.WaitTime()
	rankingState := p.Ranking()

	switch p.Rank() {
	case proto.PlayerRank_TRAINEE:
		// Lost last match OR 20 seconds in queue
		allowMatch = rankingState.Lost() || waitTime >= time.Second*20
	case proto.PlayerRank_APPRENTICE:
		// Lost last match OR 30 seconds in queue
		allowMatch = rankingState.Lost() || waitTime >= time.Second*30
	default:
		// Lost last match OR 10 seconds in queue
		allowMatch = rankingState.Lost() || waitTime >= time.Second*10
	}

	return allowMatch, nil
}
