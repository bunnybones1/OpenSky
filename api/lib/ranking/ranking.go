// This file is copied from OpenSky/api, please do not edit outside that package.

package ranking

import (
	"errors"
	"fmt"
)

const DefaultRP int32 = 0

// State represents the ranking state at any point in time
type State struct {
	Win Outcome

	R  float64
	RD float64
	RP int32
}

func NewRankState(win Outcome, r float64, rd float64, rp int32) *State {
	return &State{
		Win: win,
		R:   r,
		RD:  rd,
		RP:  rp,
	}
}

func (s State) Valid() bool {
	switch s.Win {
	case Win, Loss, Draw:
		return true
	}
	return false
}

func (s State) Won() bool {
	return s.Win == Win
}

func (s State) Lost() bool {
	return s.Win == Loss
}

func (s State) Drawn() bool {
	return s.Win == Draw
}

func (s *State) String() string {
	if s == nil {
		return "nil"
	}
	return fmt.Sprintf("{Win: %v, RD: %0.4f, R: %0.4f, RP: %d}", s.Win, s.RD, s.R, s.RP)
}

// UpdateRankState re-calculates a new rank state for a player after a match.
func UpdateRankState(win Outcome, state, oppState *State) (*State, error) {
	gk := NewGlicko()
	rk := NewRank()

	if win == OutcomeUndefined {
		return nil, fmt.Errorf("invalid outcome: %v", win)
	}

	newState := &State{
		Win: win,
	}
	newState.R = gk.UpdateRating(
		win,
		state.R,
		state.RD,
		oppState.R,
		oppState.RD,
	)
	newState.RD = gk.UpdateRD(
		state.R,
		state.RD,
		oppState.R,
		oppState.RD,
	)
	// Transformed RP into R and use that for RP changes
	// This ensures RP changes are aligned with player
	// expectation. We use R for matchmaking instead
	estimatedR := rk.EstimateR(state.RP)
	oppEstimatedR := rk.EstimateR(oppState.RP)
	newEstimatedR := gk.UpdateRating(
		win,
		estimatedR,
		state.RD,
		oppEstimatedR,
		oppState.RD,
	)

	var err error
	newState.RP, err = rk.UpdateRank(
		win,
		state.RP,
		estimatedR,
		newEstimatedR,
	)
	if err != nil {
		if errors.Is(err, errNegativeRP) {
			return InitialRankState(), nil
		}
		return nil, err
	}

	return newState, nil
}

func InitialRankState() *State {
	return &State{
		Win: OutcomeUndefined,
		R:   DefaultGlicko_Rating,
		RD:  DefaultGlicko_RDInit,
		RP:  DefaultRP,
	}
}
