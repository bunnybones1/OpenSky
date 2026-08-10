package analytics

import (
	"errors"

	"github.com/horizon-games/OpenSky/api/proto"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/policy_checker.go -package mock . PolicyChecker
type PolicyChecker interface {
	GetAnalyticsPolicyByAccountID(accountID proto.AccountID) (*proto.Account, bool, error)
}

var errMissingPolicyChecker = errors.New("missing PolicyChecker")

type rejectAllPolicyChecker struct {
}

func (p rejectAllPolicyChecker) GetAnalyticsPolicyByAccountID(proto.AccountID) (*proto.Account, bool, error) {
	return nil, false, errMissingPolicyChecker
}

var defaultPolicyChecker = &rejectAllPolicyChecker{}
