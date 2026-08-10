package ranking

import (
	"errors"
	"fmt"
	"math"
)

var errNegativeRP = errors.New("got a negative value for RP")

const (
	defaultRank_RangeMax = 2500.0 // R.SoftMax
	defaultRank_RangeMin = 1250.0 // R.SoftMin

	defaultRank_SoftMax = 1000.0
	defaultRank_SoftMin = 200.0

	defaultRank_BMax = 20.0 // b_max
	defaultRank_BMin = 2.0  // b_min

	defaultRank_FMin = 0.4

	defaultRank_StreakBonus = 15
	defaultRank_ScaleMax    = 30.0 // Attenuate Bounds

	defaultRank_Transform = 1250 // RP => R Transformation constant
)

type Rank struct {
	rangeMax float64 // this number should be approximately the median rating at RP=Soft_Max
	rangeMin float64 // this number should be approximately median rating at RP=Min

	softMax float64
	softMin float64

	bMax float64 // inflation upper bound
	bMin float64 // inflation lower bound

	fMin float64 // minimum

	streakBonus   float64 //
	scaleMax      float64
	rankTransform float64
}

func NewRank() *Rank {
	return &Rank{
		rangeMax: defaultRank_RangeMax,
		rangeMin: defaultRank_RangeMin,

		softMax: defaultRank_SoftMax,
		softMin: defaultRank_SoftMin,

		bMax: defaultRank_BMax,
		bMin: defaultRank_BMin,

		fMin: defaultRank_FMin,

		streakBonus:   defaultRank_StreakBonus,
		scaleMax:      defaultRank_ScaleMax,
		rankTransform: defaultRank_Transform,
	}
}

// F finds the current value of the dynamic scaling factor for \Delta r
func (rk *Rank) F(r int32) float64 {
	rt := rk.softMax / (rk.rangeMax - rk.rangeMin)                                // range transform
	rd := math.Min(1.0, rk.fMin+(1.0-rk.fMin)*(float64(r)-rk.softMin)/rk.softMax) // rank dependence
	return rt * rd
}

// B represents a bias value
func (rk *Rank) B(r float64) float64 {
	// TODO: maybe r could be declared as int32?
	return math.Max(
		rk.bMin,
		rk.bMax-((r-rk.softMin)/rk.softMax*(rk.bMax-rk.bMin)),
	)
}

func (rk *Rank) A(outcome ...float64) float64 {
	// TODO
	return 0
}

func (rk *Rank) EstimateR(rp int32) float64 {
	return float64(rp) + rk.rankTransform
}

// UpdateRank
func (rk *Rank) UpdateRank(win Outcome, rankOld int32, rateOld, rateNew float64) (int32, error) {
	s := win.Float64()
	if win == OutcomeUndefined {
		return 0, fmt.Errorf("invalid outcome: %v", win)
	}

	rateDelta := rk.attenuateDeltaRank(
		(rateNew - rateOld) * rk.F(rankOld),
	)

	positiveBias := s * rk.B(float64(rankOld))

	winStreakBonus := rk.A(s) // TODO: maybe we need an slice?

	updatedRank := int32(math.Round(float64(rankOld) + rateDelta + positiveBias + winStreakBonus))
	if updatedRank < 0 {
		return 0, errNegativeRP
	}

	return updatedRank, nil
}

func (rk *Rank) attenuateDeltaRank(deltaRank float64) float64 {
	return deltaRank * (1.0 - 2.0/math.Pi*math.Atan(math.Abs((2.0/math.Pi*deltaRank/rk.scaleMax))))
}
