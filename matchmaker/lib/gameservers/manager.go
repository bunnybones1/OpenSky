package gameservers

import "context"

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/manager.go -package mock . Manager
type Manager interface {
	Find(ctx context.Context, versionHash string) (*GameServerInfo, error)
	InitiateMatch(context.Context, *GameServerInfo, MatchRequest) error
}
