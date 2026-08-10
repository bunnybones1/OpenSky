package director

import (
	"context"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

type runner struct {
	logger       zerolog.Logger
	matchHandler MatchHandler
	interval     time.Duration
}

func NewRunner(
	logger zerolog.Logger,
	interval time.Duration,
	matchHandler MatchHandler,
) *runner {
	return &runner{
		logger:       logger.With().Str("fn", "director.Runner").Logger(),
		interval:     interval,
		matchHandler: matchHandler,
	}
}

func (r *runner) Run(ctx context.Context) error {
	var wg sync.WaitGroup

	wg.Add(1)

	go func() {
		defer wg.Done()

		ticker := time.NewTicker(r.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := r.matchHandler.HandleMatches(ctx); err != nil {
					r.logger.Err(err).Msg("handle matches")
				}
			}
		}
	}()

	wg.Wait()

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_handler.go -package mock . MatchHandler
type MatchHandler interface {
	HandleMatches(context.Context) error
}
