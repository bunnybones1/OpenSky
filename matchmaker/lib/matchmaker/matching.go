package matchmaker

import "context"

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/matching.go -package mock . Matching
type Matching interface {
	FindMatchProposals(context.Context, *FindMatchesRequest) ([]*MatchProposal, error)
}
