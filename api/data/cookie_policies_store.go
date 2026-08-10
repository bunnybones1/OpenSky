package data

import (
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	db "github.com/upper/db/v4"
)

func DefaultCookiePolicies() map[string]bool {
	return map[string]bool{
		proto.CookiePolicyOption_name[uint16(proto.CookiePolicyOption_AUTHENTICATION)]:    true,
		proto.CookiePolicyOption_name[uint16(proto.CookiePolicyOption_GEO_BLOCKING)]:      true,
		proto.CookiePolicyOption_name[uint16(proto.CookiePolicyOption_MARKETPLACE)]:       true,
		proto.CookiePolicyOption_name[uint16(proto.CookiePolicyOption_PRODUCT_ANALYTICS)]: false, // TODO(pk): review..?
	}
}

type CookiePoliciesStore struct {
	db.Collection
}

func (s *CookiePoliciesStore) FindOne(conds ...interface{}) (*proto.CookiePolicy, error) {
	var policy *proto.CookiePolicy

	err := s.Find(conds...).OrderBy("-id").One(&policy)
	if err != nil && err != db.ErrNoMoreRows {
		return nil, err
	}

	return policy, nil
}

func (s *CookiePoliciesStore) IsOptionEnabled(accountID proto.AccountID, option proto.CookiePolicyOption) (bool, error) {
	cookies, err := s.FindOne(db.Cond{
		"account_id": accountID,
	})
	if err != nil {
		return false, err
	}

	var policy map[string]bool
	if cookies != nil {
		policy = cookies.Policy
	} else {
		policy = DefaultCookiePolicies()
	}

	_, ok := policy[option.String()]
	if !ok {
		return false, nil // undefined options are false by default
	}

	return policy[option.String()], nil
}

// TODO: we should refactor CookiePoliciesStore to have a well defined interface for
// setting/updating/getting the cookie policy for an account, and store it in redis, as well
// persist the changes to postgres. However, when getting the actual value we should be fetching
// it from redis instead of the database each time.
//
// use goware/cachestore, and make sure to persist on changes. The rpc endpoints should also
// use this interface so it respects the cache + db layers.
func (s *CookiePoliciesStore) GetAnalyticsPolicyByAccountID(accountID proto.AccountID) (*proto.Account, bool, error) {
	if !accountID.IsValid() {
		return nil, false, fmt.Errorf("got invalid account ID")
	}

	account, err := DB.Accounts(s.Session()).FindOne(db.Cond{"id": accountID})
	if err != nil {
		return nil, false, fmt.Errorf("can not get account: %w", err)
	}

	trackingAllowed, err := s.IsOptionEnabled(account.ID, proto.CookiePolicyOption_PRODUCT_ANALYTICS)
	if err != nil {
		return nil, false, fmt.Errorf("can not get option: %w", err)
	}

	return account.Account, trackingAllowed, nil
}
