package validators

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type PenaltyValidator struct {
	logger        zerolog.Logger
	penaltyGetter PenaltyGetter
	messageSender frontend.MessageSender
}

func NewPenaltyValidator(
	logger zerolog.Logger,
	penaltyGetter PenaltyGetter,
	messageSender frontend.MessageSender,
) *PenaltyValidator {
	return &PenaltyValidator{
		logger:        logger.With().Str("fn", "validators.PenaltyValidator").Logger(),
		penaltyGetter: penaltyGetter,
		messageSender: messageSender,
	}
}

func (v *PenaltyValidator) IsValid(_ context.Context, client *frontend.Client, _ *messages.FindMatchMessage) (bool, error) {
	penalty, err := v.penaltyGetter.GetPenalty(client.Player())
	if err != nil {
		return false, fmt.Errorf("get penalty: %w", err)
	}

	if penalty > 0 {
		if err := v.messageSender.SendRefusalCooldownMessage(client, penalty); err != nil {
			v.logger.Err(err).Msg("send refusal cooldown message")
		}

		return false, nil
	}

	return true, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/penalty_getter.go -package mock . PenaltyGetter
type PenaltyGetter interface {
	GetPenalty(*player.Player) (time.Duration, error)
}
