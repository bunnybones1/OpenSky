package conquest

import (
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

// ScoreCalculatorImpl calculates score based on matches.
type ScoreCalculatorImpl struct {
}

// NewScoreCalculator instantiates as new ScoreCalculatorImpl.
func NewScoreCalculator() *ScoreCalculatorImpl {
	return &ScoreCalculatorImpl{}
}

// FromPastMatches calculates score based on matches.
func (s ScoreCalculatorImpl) FromPastMatches(matches []*data.Match, accountID proto.AccountID) int32 {
	var score int32

	for _, match := range matches {
		if *match.WinningPlayer == 1 {
			if match.Player1ID == accountID {
				score++
			} else {
				score--
			}
		}

		if *match.WinningPlayer == 2 {
			if match.Player2ID == accountID {
				score++
			} else {
				score--
			}
		}
	}

	return score
}
