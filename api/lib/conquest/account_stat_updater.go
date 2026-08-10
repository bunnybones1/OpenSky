package conquest

import (
	"context"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

const observedHistorySize = 20

// AccountStatUpdater updates score.
type AccountStatUpdater struct {
	scoreCalculator ScoreCalculator
}

// NewAccountStatUpdater instantiates a new AccountStatUpdater.
func NewAccountStatUpdater(scoreCalculator ScoreCalculator) *AccountStatUpdater {
	return &AccountStatUpdater{
		scoreCalculator: scoreCalculator,
	}
}

// RecalculateScore calculates a new score based on past matches and stores it.
func (a AccountStatUpdater) RecalculateScore(ctx context.Context, sess db.Session, mode proto.GameMode, season uint16, account *data.Account) error {
	repo := rctx.DBContext(ctx)

	if mode != proto.GameMode_CONQUEST_CONSTRUCTED && mode != proto.GameMode_CONQUEST_DISCOVERY {
		return fmt.Errorf("only conquest mode is supported, given %q", mode)
	}

	var matches []*data.Match

	err := repo.Matches(sess).Find(db.And(
		db.Cond{
			"status":         proto.MatchStatus_COMPLETED,
			"winning_player": db.Gt(0),
		},
		db.Or(
			db.Cond{"p1_id": account.ID},
			db.Cond{"p2_id": account.ID},
		),
		db.Or(
			db.Cond{"p1_game_mode": mode},
			db.Cond{"p2_game_mode": mode},
		),
	)).OrderBy("-ended_at").Limit(observedHistorySize).All(&matches)
	if err != nil && err != db.ErrNoMoreRows {
		return fmt.Errorf("find matches: %w", err)
	}

	stat, err := repo.AccountStats(sess).FindOrCreateByAccountIDAndMode(account.ID, mode, season)
	if err != nil {
		return fmt.Errorf("find account stat: %w", err)
	}

	score := a.scoreCalculator.FromPastMatches(matches, account.ID)
	stat.Score = &score

	err = sess.Save(stat)
	if err != nil {
		return fmt.Errorf("save account stat: %w", err)
	}

	return nil
}

// ScoreCalculator calculates score based on matches.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/score_calculator.go -package mock . ScoreCalculator
type ScoreCalculator interface {
	FromPastMatches([]*data.Match, proto.AccountID) int32
}
