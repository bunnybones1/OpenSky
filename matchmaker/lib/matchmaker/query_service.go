package matchmaker

import (
	"context"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/query_service.go -package mock . QueryService
type QueryService interface {
	GetPlayers(context.Context, *QueryRequest) ([]*player.Player, error)
}

type QueryRequest struct {
	GameModes []proto.GameMode
}
