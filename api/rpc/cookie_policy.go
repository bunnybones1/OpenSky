package rpc

import (
	"context"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) SaveCookiePolicy(ctx context.Context, cookieOptions map[string]bool) (bool, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	policies := data.DefaultCookiePolicies()

	for k, v := range cookieOptions {
		_, ok := proto.CookiePolicyOption_value[k]
		if !ok {
			return false, proto.Errorf(proto.ErrUnknown, "Unknown cookie policy %s", k)
		}
		if isModifiablePolicy(k) {
			policies[k] = v
		}
	}

	policy := &data.CookiePolicy{
		CookiePolicy: &proto.CookiePolicy{
			AccountID: account.ID,
			Policy:    policies,
		},
	}

	err := repo.Save(policy)
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) GetCookiePolicy(ctx context.Context) (map[string]bool, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return map[string]bool{}, nil
	}
	repo := rctx.DBContext(ctx)

	policy, err := repo.CookiePolicies().FindOne(db.Cond{
		"account_id": account.ID,
	})

	if err != nil {
		return map[string]bool{}, err
	}

	if policy != nil {
		return policy.Policy, nil
	}

	return map[string]bool{}, nil
}

func isModifiablePolicy(policy string) bool {
	return policy == proto.CookiePolicyOption_name[uint16(proto.CookiePolicyOption_PRODUCT_ANALYTICS)]
}
