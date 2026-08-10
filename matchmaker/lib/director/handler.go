package director

import (
	"context"

	"golang.org/x/sync/errgroup"
)

type Handler struct {
	runners []Runner
}

func NewHandler(runners ...Runner) *Handler {
	return &Handler{
		runners: runners,
	}
}

func (h *Handler) Run(ctx context.Context) error {
	var g *errgroup.Group

	g, ctx = errgroup.WithContext(ctx)

	for i := 0; i < len(h.runners); i++ {
		runner := h.runners[i]

		g.Go(func() error {
			return runner.Run(ctx)
		})
	}

	return g.Wait()
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/runner.go -package mock . Runner
type Runner interface {
	Run(context.Context) error
}
