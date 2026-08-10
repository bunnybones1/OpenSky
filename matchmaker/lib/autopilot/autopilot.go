// Package autopilot is a helper that can be used to watch for player events
// and perform actions.
package autopilot

import (
	"context"
	"time"

	"github.com/goware/pubsub"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
)

type Autopilot struct {
	watchedEvents map[events.Type][]func(events.Event) error
	logger        zerolog.Logger
	readTimeout   time.Duration
}

type Option func(*Autopilot) error

func WithReadTimeout(t time.Duration) Option {
	return func(ap *Autopilot) error {
		ap.readTimeout = t
		return nil
	}
}

func WithLogger(logger zerolog.Logger) Option {
	return func(ap *Autopilot) error {
		ap.logger = logger
		return nil
	}
}

func New(options ...Option) (*Autopilot, error) {
	ap := &Autopilot{
		readTimeout:   time.Second * 3600,
		logger:        zerolog.Nop(),
		watchedEvents: map[events.Type][]func(events.Event) error{},
	}

	// apply options
	for i := range options {
		if err := options[i](ap); err != nil {
			return nil, err
		}
	}

	return ap, nil
}

func (ap *Autopilot) Run(ctx context.Context, sub pubsub.Subscription[events.Event]) error {
	ticker := time.NewTicker(ap.readTimeout)

	defer func() {
		ticker.Stop()
	}()

	for {
		ticker.Reset(ap.readTimeout)

		var ev events.Event
		var ok bool

		select {
		case <-ctx.Done():
			ap.logger.Debug().Msg("context canceled")
			return nil
		case <-ticker.C:
			ap.logger.Debug().Msg("timed-out")
			return nil
		case ev, ok = <-sub.ReadMessage():
			if !ok {
				ap.logger.Debug().Msg("channel reader closed")
				return nil
			}
		}

		listeners, ok := ap.watchedEvents[ev.Type()]
		if !ok {
			ap.logger.Debug().Msgf("unhandled event type: %v", ev.Type())
			continue
		}

		for i := range listeners {
			if err := listeners[i](ev); err != nil {
				ap.logger.Debug().Err(err).Msg("listener failed")
				return err
			}
		}

	}
}

func (ap Autopilot) Watch(ev events.Type, fn func(events.Event) error) {
	if ap.watchedEvents[ev] == nil {
		ap.watchedEvents[ev] = []func(events.Event) error{}
	}
	ap.watchedEvents[ev] = append(ap.watchedEvents[ev], fn)
}
