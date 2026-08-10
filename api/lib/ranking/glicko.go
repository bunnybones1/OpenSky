// This file is copied from OpenSky/api, please do not edit outside that package.

package ranking

import (
	"math"
)

const (
	DefaultGlicko_RMin = 1.0

	DefaultGlicko_RDMin         = 50.0 // RD_Min
	DefaultGlicko_RDInit        = 350.0
	DefaultGlicko_RDResetFactor = 75.0

	DefaultGlicko_C = 173.2

	DefaultGlicko_ScaleResolution = 400.0

	DefaultGlicko_Rating = 1750 // R_init
)

type Glicko struct {
	rMin float64 // minimum R

	rdMin  float64 // minimum RD
	rdInit float64 // the highest RD for players with no recent data

	c float64 // uncertainty timescale

	q               float64 // scale of the rating system
	scaleResolution float64 // scale resolution
}

func NewGlicko() *Glicko {
	g := &Glicko{
		rMin:   DefaultGlicko_RMin,
		rdMin:  DefaultGlicko_RDMin,
		rdInit: DefaultGlicko_RDInit,

		c: DefaultGlicko_C,

		scaleResolution: DefaultGlicko_ScaleResolution,
	}
	g.q = math.Log(10) / g.scaleResolution
	return g
}

// G is a function that helps scale the outcome based on the rating
// certainty
func (gk *Glicko) G(rd float64) float64 {
	return 1.0 / SQRT(
		1.0+(3.0*SQ(gk.q)*SQ(rd))/math.Pi,
	)
}

// ExpOutcome is the expected outcome of a match based on a player's ranking
// and the ranking & RD of their opponent
func (gk *Glicko) ExpOutcome(r, rOpp, rdOpp float64) float64 {
	r = math.Max(r, gk.rMin)
	rOpp = math.Max(rOpp, gk.rMin)

	return 1.0 / (1.0 + math.Pow(10.0, -1.0*gk.G(rdOpp)*(r-rOpp)/gk.scaleResolution))
}

// DSQ is a function that is consistently used to scale the changes
// to r and RD
func (gk *Glicko) DSQ(r, rOpp, rdOpp float64) float64 {
	r = math.Max(r, gk.rMin)
	rOpp = math.Max(rOpp, gk.rMin)

	eo := gk.ExpOutcome(r, rOpp, rdOpp) // expected outcome
	dsq := 1.0 / (SQ(gk.q) * SQ(gk.G(rdOpp)) * eo * (1.0 - eo))
	return dsq
}

// RD is a function that calculates the rating deviation for the
// period.
func (gk *Glicko) RD(rdOld, t float64) float64 {
	// TODO: specify unit for "t"
	return math.Min(
		SQRT(SQ(rdOld)+(SQ(gk.c)*t)),
		gk.rdInit,
	)
}

func (gk *Glicko) UpdateRating(win Outcome, r, rd, rOpp, rdOpp float64) float64 {
	r = math.Max(r, gk.rMin)
	rOpp = math.Max(rOpp, gk.rMin)

	s := win.Float64()
	deltaScale := gk.q / (1.0/SQ(rd) + 1.0/gk.DSQ(r, rOpp, rdOpp)) * gk.G(rdOpp)
	deltaDirection := s - gk.ExpOutcome(r, rOpp, rdOpp)
	return r + deltaScale*deltaDirection
}

func (gk *Glicko) UpdateRD(r, rd, rOpp, rdOpp float64) float64 {
	r = math.Max(r, gk.rMin)
	rOpp = math.Max(rOpp, gk.rMin)

	updatedRD := math.Max(
		SQRT(1.0/(1.0/SQ(rd)+1.0/gk.DSQ(r, rOpp, rdOpp))),
		gk.rdMin,
	)

	return updatedRD
}

func SQ(n float64) float64 {
	return math.Pow(n, 2)
}

func SQRT(n float64) float64 {
	return math.Sqrt(n)
}
