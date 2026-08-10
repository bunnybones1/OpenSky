package matchquality

import (
	"fmt"
)

type Factor interface {
	Scaler() float64
	Exponent() float64
	Value() float64
	String() string
}

type factor struct {
	name     string
	scaler   float64
	exponent float64
	value    float64
}

func NewFactor(name string, scaler, exponent, value float64) *factor {
	return &factor{
		name:     name,
		scaler:   scaler,
		exponent: exponent,
		value:    value,
	}
}

func (q factor) Value() float64 {
	return q.value
}

func (q factor) Scaler() float64 {
	return q.scaler
}

func (q factor) Exponent() float64 {
	return q.exponent
}

func (q factor) String() string {
	return fmt.Sprintf("%s: %v", q.name, q.value)
}
