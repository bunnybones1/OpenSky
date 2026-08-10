package errors

import (
	"errors"
	"fmt"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
)

var (
	ErrCannotObtainMatchID       = events.NewError("CANNOT_OBTAIN_MATCH_ID")
	ErrConquestDeckClassMismatch = events.NewError("CONQUEST_DECK_CLASS_MISMATCH")
	ErrDuplicateConnection       = events.NewError("DUPLICATE_CONNECTION")
	ErrInvalidAccount            = events.NewError("INVALID_ACCOUNT")
	ErrInvalidDeck               = events.NewError("INVALID_DECK")
	ErrDeckIsNotRandom           = events.NewError("DECK_IS_NOT_RANDOM")
	ErrSessionIsEmpty            = events.NewError("SESSION_IS_EMPTY")
	ErrInvalidOperation          = events.NewError("INVALID_OPERATION")
	ErrInvalidPrivateSeed        = events.NewError("INVALID_PRIVATE_SEED")
	ErrMatchCreationFailed       = events.NewError("MATCH_CREATION_FAILED")
	ErrNoAvailableGameServer     = events.NewError("NO_AVAILABLE_GAME_SERVER")
	ErrOutdatedClient            = events.NewError("OUTDATED_CLIENT")
	ErrPendingMatchCreation      = events.NewError("PENDING_MATCH_CREATION")
	ErrPlayerHasExistingMatch    = events.NewError("PLAYER_HAS_EXISTING_MATCH")
	ErrServerShutdown            = events.NewError("SERVER_SHUTDOWN")
	ErrGameModeDisabled          = events.NewError("GAME_MODE_DISABLED")
	ErrCantFetchSeason           = events.NewError("FAILED_TO_FETCH_SEASON")

	ErrServerError = events.NewError("SERVER_ERROR")
)

var (
	ErrNotImplemented = errors.New("not implemented")
	ErrMissingChannel = errors.New("player channel is missing")
	ErrMissingPlayer  = errors.New("player data is missing")
	ErrUnauthorized   = proto.WrapError(proto.ErrUnauthenticated, nil, "unauthorized")
	ErrSessionExpired = proto.WrapError(proto.ErrPermissionDenied, nil, "session expired")
)

type CooldownPenaltyError struct {
	Duration time.Duration
}

func (e CooldownPenaltyError) Error() string {
	return fmt.Sprintf("player is on a cooldown penalty: %v", e.Duration)
}
