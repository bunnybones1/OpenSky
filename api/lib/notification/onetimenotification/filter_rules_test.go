package onetimenotification_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/lib/notification/onetimenotification"
)

func TestFilterRules(t *testing.T) {
	t.Run("decodes JSON", func(t *testing.T) {
		t.Run("with age", func(t *testing.T) {
			rules := []byte(`{"age": [{">": "1h"}]}`)

			var filterRules *onetimenotification.FilterRules

			err := json.Unmarshal(rules, &filterRules)
			require.NoError(t, err)

			assert.True(t, filterRules.IsValid(&onetimenotification.AccountForFilter{Age: time.Hour * 2}))
			assert.False(t, filterRules.IsValid(&onetimenotification.AccountForFilter{Age: time.Minute}))
		})

		t.Run("with created at", func(t *testing.T) {
			rules := []byte(`{"created_at": [{"<": "2023-01-04"}]}`)

			var filterRules *onetimenotification.FilterRules

			err := json.Unmarshal(rules, &filterRules)
			require.NoError(t, err)

			assert.True(t, filterRules.IsValid(&onetimenotification.AccountForFilter{CreatedAt: time.Date(2023, 1, 3, 0, 0, 0, 0, time.UTC)}))
			assert.False(t, filterRules.IsValid(&onetimenotification.AccountForFilter{CreatedAt: time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC)}))
		})

		t.Run("with address", func(t *testing.T) {
			rules := []byte(`{"address": [{"==": "abc"}]}`)

			var filterRules *onetimenotification.FilterRules

			err := json.Unmarshal(rules, &filterRules)
			require.NoError(t, err)

			assert.True(t, filterRules.IsValid(&onetimenotification.AccountForFilter{Address: "abc"}))
			assert.False(t, filterRules.IsValid(&onetimenotification.AccountForFilter{Address: "xyz"}))
		})
	})

	t.Run("validates", func(t *testing.T) {
		t.Run("is valid when there are no rules", func(t *testing.T) {
			account := &onetimenotification.AccountForFilter{}

			filterRules := onetimenotification.NewFilterRules(nil, nil)

			assert.True(t, filterRules.IsValid(account))
		})

		t.Run("by age", func(t *testing.T) {
			account := &onetimenotification.AccountForFilter{
				Age: time.Hour,
			}

			t.Run("is valid when age rule is valid", func(t *testing.T) {
				filterRules := onetimenotification.NewFilterRules(&filterRuleDummyTrue[time.Duration]{}, nil)

				assert.True(t, filterRules.IsValid(account))
			})

			t.Run("is not valid when age rule is not valid", func(t *testing.T) {
				filterRules := onetimenotification.NewFilterRules(&filterRuleDummyFalse[time.Duration]{}, nil)

				assert.False(t, filterRules.IsValid(account))
			})
		})

		t.Run("by created at", func(t *testing.T) {
			account := &onetimenotification.AccountForFilter{
				CreatedAt: time.Now(),
			}

			t.Run("is valid when created at rule is valid", func(t *testing.T) {
				filterRules := onetimenotification.NewFilterRules(nil, &filterRuleDummyTrue[onetimenotification.CreatedAt]{})

				assert.True(t, filterRules.IsValid(account))
			})

			t.Run("is not valid when created at rule is not valid", func(t *testing.T) {
				filterRules := onetimenotification.NewFilterRules(nil, &filterRuleDummyFalse[onetimenotification.CreatedAt]{})

				assert.False(t, filterRules.IsValid(account))
			})
		})
	})
}

func TestFilterRuleAnd(t *testing.T) {
	t.Run("decodes JSON", func(t *testing.T) {
		t.Run("with greater than", func(t *testing.T) {
			var rule *onetimenotification.FilterRuleAnd[int]

			err := json.Unmarshal([]byte(`[{">": 2}]`), &rule)
			require.NoError(t, err)

			assert.True(t, rule.IsValid(3))
			assert.False(t, rule.IsValid(1))
		})

		t.Run("with greater than or equal", func(t *testing.T) {
			var rule *onetimenotification.FilterRuleAnd[int]

			err := json.Unmarshal([]byte(`[{">=": 2}]`), &rule)
			require.NoError(t, err)

			assert.True(t, rule.IsValid(3))
			assert.True(t, rule.IsValid(2))
			assert.False(t, rule.IsValid(1))
		})

		t.Run("with less than", func(t *testing.T) {
			var rule *onetimenotification.FilterRuleAnd[int]

			err := json.Unmarshal([]byte(`[{"<": 2}]`), &rule)
			require.NoError(t, err)

			assert.True(t, rule.IsValid(1))
			assert.False(t, rule.IsValid(3))
		})

		t.Run("with less than or equal", func(t *testing.T) {
			var rule *onetimenotification.FilterRuleAnd[int]

			err := json.Unmarshal([]byte(`[{"<=": 2}]`), &rule)
			require.NoError(t, err)

			assert.True(t, rule.IsValid(1))
			assert.True(t, rule.IsValid(2))
			assert.False(t, rule.IsValid(3))
		})

		t.Run("with equal", func(t *testing.T) {
			var rule *onetimenotification.FilterRuleAnd[string]

			err := json.Unmarshal([]byte(`[{"==": "abc"}]`), &rule)
			require.NoError(t, err)

			assert.True(t, rule.IsValid("abc"))
			assert.False(t, rule.IsValid("xyz"))
		})

		t.Run("fails when the key is not supported", func(t *testing.T) {
			var rule *onetimenotification.FilterRuleAnd[int]

			err := json.Unmarshal([]byte(`[{"wrong": 2}]`), &rule)
			require.ErrorContains(t, err, "unsupported key")
		})
	})

	t.Run("is valid when all are valid", func(t *testing.T) {
		rule := onetimenotification.NewFilterRuleAnd[int]([]onetimenotification.FilterRule[int]{
			&filterRuleDummyTrue[int]{},
			&filterRuleDummyTrue[int]{},
		})

		assert.True(t, rule.IsValid(2))
	})
	t.Run("is not valid when any of rules is invalid", func(t *testing.T) {
		rule := onetimenotification.NewFilterRuleAnd[int]([]onetimenotification.FilterRule[int]{
			&filterRuleDummyTrue[int]{},
			&filterRuleDummyFalse[int]{},
		})

		assert.False(t, rule.IsValid(2))
	})
}

func TestFilterRuleGreaterThan(t *testing.T) {
	t.Run("duration", func(t *testing.T) {
		t.Run("is valid when it is greater", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThan[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(time.Hour*2))
		})

		t.Run("is not valid when it is less", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThan[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.False(t, rule.IsValid(time.Minute))
		})
	})

	t.Run("created at", func(t *testing.T) {
		t.Run("is valid when it is greater", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThan[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC))))
		})

		t.Run("is not valid when it is less", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThan[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.False(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 3, 0, 0, 0, 0, time.UTC))))
		})
	})
}

func TestFilterRuleGreaterThanOrEqual(t *testing.T) {
	t.Run("duration", func(t *testing.T) {
		t.Run("is valid when it is greater", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThanOrEqual[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(time.Hour*2))
		})

		t.Run("is valid when it is equal", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThanOrEqual[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(time.Hour))
		})

		t.Run("is not valid when it is less", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThanOrEqual[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.False(t, rule.IsValid(time.Minute))
		})
	})

	t.Run("created at", func(t *testing.T) {
		t.Run("is valid when it is greater", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThanOrEqual[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC))))
		})

		t.Run("is valid when it is equal", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThanOrEqual[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 4, 0, 0, 0, 0, time.UTC))))
		})

		t.Run("is not valid when it is less", func(t *testing.T) {
			var rule onetimenotification.FilterRuleGreaterThanOrEqual[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.False(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 3, 0, 0, 0, 0, time.UTC))))
		})
	})
}

func TestFilterRuleLessThan(t *testing.T) {
	t.Run("duration", func(t *testing.T) {
		t.Run("is valid when it is less", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThan[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(time.Minute))
		})

		t.Run("is not valid when it is greater", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThan[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.False(t, rule.IsValid(time.Hour*2))
		})
	})

	t.Run("created at", func(t *testing.T) {
		t.Run("is valid when it is less", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThan[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 3, 0, 0, 0, 0, time.UTC))))
		})

		t.Run("is not valid when it is greater", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThan[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.False(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC))))
		})
	})
}

func TestFilterRuleLessThanOrEqual(t *testing.T) {
	t.Run("duration", func(t *testing.T) {
		t.Run("is valid when it is less", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThanOrEqual[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(time.Minute))
		})

		t.Run("is valid when it is equal", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThanOrEqual[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(time.Hour))
		})

		t.Run("is not valid when it is greater", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThanOrEqual[time.Duration]

			err := json.Unmarshal([]byte(`"1h"`), &rule)
			require.NoError(t, err)

			require.False(t, rule.IsValid(time.Hour*2))
		})
	})

	t.Run("created at", func(t *testing.T) {
		t.Run("is valid when it is less", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThanOrEqual[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 3, 0, 0, 0, 0, time.UTC))))
		})

		t.Run("is valid when it is equal", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThanOrEqual[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.True(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 4, 0, 0, 0, 0, time.UTC))))
		})

		t.Run("is not valid when it is greater", func(t *testing.T) {
			var rule onetimenotification.FilterRuleLessThanOrEqual[onetimenotification.CreatedAt]

			err := json.Unmarshal([]byte(`"2023-01-04"`), &rule)
			require.NoError(t, err)

			require.False(t, rule.IsValid(onetimenotification.CreatedAtFromTime(time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC))))
		})
	})
}

func TestFilterRuleEqual(t *testing.T) {
	t.Run("is valid when it is equal", func(t *testing.T) {
		var rule onetimenotification.FilterRuleEqual[string]

		err := json.Unmarshal([]byte(`"abc"`), &rule)
		require.NoError(t, err)

		require.True(t, rule.IsValid("abc"))
	})

	t.Run("is not valid when it is not equal", func(t *testing.T) {
		var rule onetimenotification.FilterRuleEqual[string]

		err := json.Unmarshal([]byte(`"abc"`), &rule)
		require.NoError(t, err)

		require.False(t, rule.IsValid("xyz"))
	})
}

type filterRuleDummyTrue[V comparable] struct {
}

func (r *filterRuleDummyTrue[V]) IsValid(_ V) bool {
	return true
}

type filterRuleDummyFalse[V comparable] struct {
}

func (r *filterRuleDummyFalse[V]) IsValid(_ V) bool {
	return false
}
