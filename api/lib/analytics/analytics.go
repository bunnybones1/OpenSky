//go:generate go run github.com/webrpc/webrpc/cmd/webrpc-gen -schema=analytics.ridl -target=go -pkg=analytics -out=./analytics.gen.go
//go:generate go run github.com/webrpc/webrpc/cmd/webrpc-gen -schema=analytics.ridl -target=ts -client -out=./analytics.gen.ts

package analytics

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"sync/atomic"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/rs/zerolog"
	"golang.org/x/sync/errgroup"
)

type Analytics struct {
	ctx       context.Context
	ctxStopFn func()

	logger        zerolog.Logger
	sinks         []Sink
	policyChecker PolicyChecker
	enabled       bool

	running atomic.Bool
	mu      sync.Mutex
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/sink.go -package mock . Sink
type Sink interface {
	Name() string

	Run(ctx context.Context) error
	Stop() error
	IsRunning() bool
	IsEnabled() bool

	Track(r *http.Request, trackingAllowed bool, eventType EventType, account *proto.Account, props Props) error
}

type TrackerSetter interface {
	SetAnalyticsTracker(Tracker)
}

var (
	errAccountIDMismatch     = errors.New("analytics: account ID mismatch")
	errTrackerAlreadyRunning = errors.New("analytics: tracker is already running")
	errTrackerIsNotRunning   = errors.New("analytics: tracker is not running")
	errTrackerIsNotEnabled   = errors.New("analytics: tracker is not enabled")
)

var _ Tracker = &Analytics{}

func NewAnalytics(cfg config.Analytics, logger zerolog.Logger, policyChecker PolicyChecker) (*Analytics, error) {
	t := &Analytics{
		logger:        logger,
		policyChecker: policyChecker,
		enabled:       cfg.Enabled,
		sinks:         []Sink{},
	}

	if t.policyChecker == nil {
		t.policyChecker = defaultPolicyChecker
	}

	return t, nil
}

func (a *Analytics) AddSink(sink Sink) error {
	if a.IsRunning() {
		return errTrackerAlreadyRunning
	}
	a.sinks = append(a.sinks, sink)
	return nil
}

func (a *Analytics) SetLogger(logger zerolog.Logger) *Analytics {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.logger = logger.With().
		Str("module", "analytics").
		Logger()

	return a
}

func (a *Analytics) SetPolicyChecker(p PolicyChecker) *Analytics {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.policyChecker = p
	return a
}

func (a *Analytics) Run(ctx context.Context) error {
	if a.IsRunning() {
		return errTrackerAlreadyRunning
	}
	defer a.running.Store(true)

	a.ctx, a.ctxStopFn = context.WithCancel(ctx)

	g, gctx := errgroup.WithContext(a.ctx)

	for _, sink := range a.sinks {
		sink := sink // loop var
		g.Go(func() error {
			err := sink.Run(gctx)
			if err != nil {
				a.logger.Err(err).Str("sink", sink.Name()).Msg("unable to run sink")
			}
			return err
		})
	}

	go func() {
		if err := g.Wait(); err != nil {
			a.logger.Err(err).Msg("tracker runner failed")
		}
	}()

	return nil
}

func (a *Analytics) Stop() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if !a.IsRunning() {
		return nil
	}
	defer a.running.Store(false)

	// stop all sinks
	for _, sink := range a.sinks {
		if err := sink.Stop(); err != nil {
			a.logger.Err(err).Str("sink", sink.Name()).Msg("failed to stop sink")
		}
	}

	a.ctxStopFn() // force-stop

	return nil
}

func (a *Analytics) IsRunning() bool {
	return a.running.Load()
}

func (a *Analytics) IsEnabled() bool {
	return a.enabled
}

func (a *Analytics) enqueueEvent(r *http.Request, trackingAllowed bool, eventType EventType, account *proto.Account, props Props) {
	if !a.IsRunning() {
		a.logger.Debug().Msgf("event dropped: %s", errTrackerIsNotRunning)
		return
	}
	if !a.IsEnabled() {
		a.logger.Debug().Msgf("event dropped: %s", errTrackerIsNotEnabled)
		return
	}

	for _, sink := range a.sinks {
		select {
		case <-a.ctx.Done():
			// to be called on forced exit
			a.logger.Debug().Msg("events dropped, tracked stopped")
		default:
			// NOTE: we dispatch directly to each sink, as each sink themselves already
			// has a queue / flusher built-in, as is the case for databeat and segment :)
			if err := sink.Track(r, trackingAllowed, eventType, account, props); err != nil {
				a.logger.Err(err).Str("sink", sink.Name()).Msgf("event %q not tracked", eventType)
			}
		}
	}
}
