// This file is copied from OpenSky/api, please do not edit outside that package.

package ranking

type Outcome uint8

const (
	OutcomeUndefined Outcome = iota

	Win
	Draw
	Loss
)

func NewOutcome(v float64) Outcome {
	switch v {
	case 0.0:
		return Loss
	case 0.5:
		return Draw
	case 1.0:
		return Win
	}
	return OutcomeUndefined
}

func (w Outcome) Float64() float64 {
	switch w {
	case Win:
		return 1.0
	case Draw:
		return 0.5
	case Loss:
		return 0.0
	}
	return -1.0
}

func (w Outcome) String() string {
	switch w {
	case Win:
		return "WIN"
	case Loss:
		return "LOSS"
	case Draw:
		return "DRAW"
	}
	return "?"
}
