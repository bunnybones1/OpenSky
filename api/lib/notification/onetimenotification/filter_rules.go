package onetimenotification

import (
	"encoding/json"
	"fmt"
	"time"

	"golang.org/x/exp/constraints"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	filterRuleKeyAge                = "age"
	filterRuleKeyAddress            = "address"
	filterRuleKeyCreatedAt          = "created_at"
	filterRuleKeyGreaterThan        = ">"
	filterRuleKeyGreaterThanOrEqual = ">="
	filterRuleKeyLessThan           = "<"
	filterRuleKeyLessThanOrEqual    = "<="
	filterRuleKeyEqual              = "=="

	createdAtLayout = "2006-01-02"
)

type FilterRules struct {
	age       FilterRule[time.Duration]
	address   FilterRule[string]
	createdAt FilterRule[CreatedAt]
}

func NewFilterRules(age FilterRule[time.Duration], createdAt FilterRule[CreatedAt]) *FilterRules {
	return &FilterRules{
		age:       age,
		createdAt: createdAt,
	}
}

func (r *FilterRules) UnmarshalJSON(data []byte) error {
	var v map[string]json.RawMessage

	if err := json.Unmarshal(data, &v); err != nil {
		return fmt.Errorf("unmarschal map: %w", err)
	}

	for key, value := range v {
		switch key {
		case filterRuleKeyAge:
			var rule *FilterRuleAnd[time.Duration]

			if err := json.Unmarshal(value, &rule); err != nil {
				return fmt.Errorf("unmarschal age: %w", err)
			}

			r.age = rule
		case filterRuleKeyAddress:
			var rule *FilterRuleAnd[string]

			if err := json.Unmarshal(value, &rule); err != nil {
				return fmt.Errorf("unmarschal age: %w", err)
			}

			r.address = rule
		case filterRuleKeyCreatedAt:
			var rule *FilterRuleAnd[CreatedAt]

			if err := json.Unmarshal(value, &rule); err != nil {
				return fmt.Errorf("unmarschal created_at: %w", err)
			}

			r.createdAt = rule
		default:
			return fmt.Errorf("unsupported key %q", key)
		}
	}

	return nil
}

func (r *FilterRules) IsValid(account *AccountForFilter) bool {
	if r.age != nil {
		if !r.age.IsValid(account.Age) {
			return false
		}
	}

	if r.address != nil {
		if !r.address.IsValid(account.Address.String()) {
			return false
		}
	}

	if r.createdAt != nil {
		if !r.createdAt.IsValid(CreatedAtFromTime(account.CreatedAt)) {
			return false
		}
	}

	return true
}

type FilterRule[V Comparable] interface {
	IsValid(V) bool
}

type Comparable interface {
	constraints.Integer | string
}

type CreatedAt int64

func CreatedAtFromTime(t time.Time) CreatedAt {
	return CreatedAt(t.Unix())
}

type AccountForFilter struct {
	Address   proto.Hash
	Age       time.Duration
	CreatedAt time.Time
}

type FilterRuleAnd[V Comparable] struct {
	rules []FilterRule[V]
}

func NewFilterRuleAnd[V Comparable](rules []FilterRule[V]) *FilterRuleAnd[V] {
	return &FilterRuleAnd[V]{
		rules: rules,
	}
}

func (r *FilterRuleAnd[V]) UnmarshalJSON(data []byte) error {
	var slice []json.RawMessage

	if err := json.Unmarshal(data, &slice); err != nil {
		return fmt.Errorf("unmarschal slice: %w", err)
	}

	for _, piece := range slice {
		var m map[string]json.RawMessage

		if err := json.Unmarshal(piece, &m); err != nil {
			return fmt.Errorf("unmarschal map: %w", err)
		}

		for key, val := range m {
			switch key {
			case filterRuleKeyGreaterThan:
				var rule *FilterRuleGreaterThan[V]

				if err := json.Unmarshal(val, &rule); err != nil {
					return fmt.Errorf("unmarschal rule: %w", err)
				}

				r.rules = append(r.rules, rule)
			case filterRuleKeyGreaterThanOrEqual:
				var rule *FilterRuleGreaterThanOrEqual[V]

				if err := json.Unmarshal(val, &rule); err != nil {
					return fmt.Errorf("unmarschal rule: %w", err)
				}

				r.rules = append(r.rules, rule)
			case filterRuleKeyLessThan:
				var rule *FilterRuleLessThan[V]

				if err := json.Unmarshal(val, &rule); err != nil {
					return fmt.Errorf("unmarschal rule: %w", err)
				}

				r.rules = append(r.rules, rule)
			case filterRuleKeyLessThanOrEqual:
				var rule *FilterRuleLessThanOrEqual[V]

				if err := json.Unmarshal(val, &rule); err != nil {
					return fmt.Errorf("unmarschal rule: %w", err)
				}

				r.rules = append(r.rules, rule)
			case filterRuleKeyEqual:
				var rule *FilterRuleEqual[V]

				if err := json.Unmarshal(val, &rule); err != nil {
					return fmt.Errorf("unmarschal rule: %w", err)
				}

				r.rules = append(r.rules, rule)
			default:
				return fmt.Errorf("unsupported key %q", key)
			}
		}
	}

	return nil
}

func (r *FilterRuleAnd[V]) IsValid(v V) bool {
	for _, comparator := range r.rules {
		if !comparator.IsValid(v) {
			return false
		}
	}

	return true
}

type FilterRuleGreaterThan[V Comparable] struct {
	v V
}

func (r *FilterRuleGreaterThan[V]) IsValid(v V) bool {
	return v > r.v
}

func (r *FilterRuleGreaterThan[V]) UnmarshalJSON(data []byte) error {
	var err error

	switch any(r.v).(type) {
	case time.Duration:
		r.v, err = unmarshalDuration[V](data)
	case CreatedAt:
		r.v, err = unmarshalCreatedAt[V](data)
	default:
		if err := json.Unmarshal(data, &r.v); err != nil {
			return fmt.Errorf("unmarschal number: %w", err)
		}
	}

	return err
}

type FilterRuleGreaterThanOrEqual[V Comparable] struct {
	v V
}

func (r *FilterRuleGreaterThanOrEqual[V]) IsValid(v V) bool {
	return v >= r.v
}

func (r *FilterRuleGreaterThanOrEqual[V]) UnmarshalJSON(data []byte) error {
	var err error

	switch any(r.v).(type) {
	case time.Duration:
		r.v, err = unmarshalDuration[V](data)
	case CreatedAt:
		r.v, err = unmarshalCreatedAt[V](data)
	default:
		if err := json.Unmarshal(data, &r.v); err != nil {
			return fmt.Errorf("unmarschal number: %w", err)
		}
	}

	return err
}

type FilterRuleLessThan[V Comparable] struct {
	v V
}

func (r *FilterRuleLessThan[V]) IsValid(v V) bool {
	return v < r.v
}

func (r *FilterRuleLessThan[V]) UnmarshalJSON(data []byte) error {
	var err error

	switch any(r.v).(type) {
	case time.Duration:
		r.v, err = unmarshalDuration[V](data)
	case CreatedAt:
		r.v, err = unmarshalCreatedAt[V](data)
	default:
		if err := json.Unmarshal(data, &r.v); err != nil {
			return fmt.Errorf("unmarschal number: %w", err)
		}
	}

	return err
}

type FilterRuleLessThanOrEqual[V Comparable] struct {
	v V
}

func (r *FilterRuleLessThanOrEqual[V]) IsValid(v V) bool {
	return v <= r.v
}

func (r *FilterRuleLessThanOrEqual[V]) UnmarshalJSON(data []byte) error {
	var err error
	switch any(r.v).(type) {
	case time.Duration:
		r.v, err = unmarshalDuration[V](data)
	case CreatedAt:
		r.v, err = unmarshalCreatedAt[V](data)
	default:
		if err := json.Unmarshal(data, &r.v); err != nil {
			return fmt.Errorf("unmarschal number: %w", err)
		}
	}

	return err
}

type FilterRuleEqual[V Comparable] struct {
	v V
}

func (r *FilterRuleEqual[V]) IsValid(v V) bool {
	return v == r.v
}

func (r *FilterRuleEqual[V]) UnmarshalJSON(data []byte) error {
	if err := json.Unmarshal(data, &r.v); err != nil {
		return fmt.Errorf("unmarschal comparable: %w", err)
	}

	return nil
}

func unmarshalDuration[V Comparable](data []byte) (v V, err error) {
	var durationString string

	if err := json.Unmarshal(data, &durationString); err != nil {
		return v, fmt.Errorf("unmarschal duration string: %w", err)
	}

	var target any

	target, err = time.ParseDuration(durationString)
	if err != nil {
		return v, fmt.Errorf("parse duration: %w", err)
	}

	v = target.(V)

	return v, nil
}

func unmarshalCreatedAt[V Comparable](data []byte) (v V, err error) {
	var createdAtString string

	if err := json.Unmarshal(data, &createdAtString); err != nil {
		return v, fmt.Errorf("unmarschal created at string: %w", err)
	}

	var target any

	parsed, err := time.Parse(createdAtLayout, createdAtString)
	if err != nil {
		return v, fmt.Errorf("parse created at: %w", err)
	}

	target = CreatedAtFromTime(parsed)

	v = target.(V)

	return v, nil
}
