package onetimenotification

import (
	"encoding/json"
	"fmt"

	"github.com/horizon-games/OpenSky/api/data"
)

type AccountValidatorImpl struct {
}

func NewAccountValidator() *AccountValidatorImpl {
	return &AccountValidatorImpl{}
}

func (a *AccountValidatorImpl) IsValid(rules []byte, account *data.Account) (bool, error) {
	var filterRules *FilterRules

	if err := json.Unmarshal(rules, &filterRules); err != nil {
		return false, fmt.Errorf("parse data: %w", err)
	}

	accountForFiler := &AccountForFilter{
		Address:   account.Address,
		Age:       account.CreatedAt.Sub(data.TimeNowUTC()).Abs(),
		CreatedAt: *account.CreatedAt,
	}

	if !filterRules.IsValid(accountForFiler) {
		return false, nil
	}

	return true, nil
}
