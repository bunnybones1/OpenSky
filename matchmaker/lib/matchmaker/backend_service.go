package matchmaker

import (
	"context"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/backend_service.go -package mock . BackendService
type BackendService interface {
	FindMatchProposals(context.Context, *FindMatchesRequest) ([]*MatchProposal, error)
	ReleasePlayer(context.Context, *player.Player) error
	MatchFound(context.Context, MatchProcessedData) error
	MatchMade(context.Context, MatchProcessedData) error
}

type FindMatchesRequest struct {
	GameModes           []proto.GameMode
	MatchProposalStatus MatchProposalStatus
	EnableBots          bool
}

type MatchProcessedData struct {
	MatchProposal  *MatchProposal
	GameServerInfo *gameservers.GameServerInfo
}
