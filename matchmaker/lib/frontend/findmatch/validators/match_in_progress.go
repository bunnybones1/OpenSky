package validators

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type MatchInProgressValidator struct {
	matchInProgressChecker MatchInProgressChecker
	messageSender          frontend.MessageSender
}

func NewMatchInProgressValidator(
	matchInProgressChecker MatchInProgressChecker,
	messageSender frontend.MessageSender,
) *MatchInProgressValidator {
	return &MatchInProgressValidator{
		matchInProgressChecker: matchInProgressChecker,
		messageSender:          messageSender,
	}
}

func (v *MatchInProgressValidator) IsValid(_ context.Context, client *frontend.Client, _ *messages.FindMatchMessage) (bool, error) {
	inProgressMatchInfo, err := v.matchInProgressChecker.GetMatch(client.Player().Address())
	if err != nil {
		return false, fmt.Errorf("get in progress match info: %w", err)
	}

	if inProgressMatchInfo != nil {
		matchMadeMessage := events.EventMadeMessage{
			ServerAddress: inProgressMatchInfo.ServerInfo.WebSocketURL(),
			Mode:          inProgressMatchInfo.MatchInfo.Mode,
		}

		if err := v.messageSender.SendMatchedMessage(client, matchMadeMessage); err != nil {
			return false, fmt.Errorf("send matched message: %w", err)
		}

		return false, nil
	}

	return true, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_in_progress_checker.go -package mock . MatchInProgressChecker
type MatchInProgressChecker interface {
	GetMatch(proto.Hash) (*messages.InProgressMatchInfo, error)
}
