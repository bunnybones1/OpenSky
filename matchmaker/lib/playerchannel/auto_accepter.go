package playerchannel

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/autopilot"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
)

type autoAccepter struct {
	matchAccepter               MatchAccepter
	bypassWaitTimeChecksEnabled bool

	ctx context.Context
}

func NewAutoAccepter(cfg *config.Config, matchAccepter MatchAccepter) *autoAccepter {
	return &autoAccepter{
		matchAccepter:               matchAccepter,
		bypassWaitTimeChecksEnabled: cfg.Testing.PlayerBotBypassWaitTimeChecksEnabled,
	}
}

func (a *autoAccepter) Run(ctx context.Context) error {
	a.ctx = ctx

	return nil
}

func (a *autoAccepter) ListenAndAutoAccept(channel *PlayerChannel) error {
	ctx, cancelFn := context.WithCancel(a.ctx)
	defer cancelFn()

	ap, err := autopilot.New(
		autopilot.WithReadTimeout(time.Second * 60),
	)
	if err != nil {
		return fmt.Errorf("initiate autopilot: %w", err)
	}

	ap.Watch(events.TypeFound, func(ev events.Event) error {
		if !a.bypassWaitTimeChecksEnabled {
			randomWaitTime := time.Duration(1000+rand.Intn(4000)) * time.Millisecond
			time.Sleep(randomWaitTime)
		}

		if err := a.matchAccepter.AcceptMatch(ctx, channel.Player().Address()); err != nil {
			return fmt.Errorf("accept match: %w", err)
		}

		return nil
	})

	ap.Watch(events.TypeDeclined, func(ev events.Event) error {
		cancelFn()
		return nil
	})

	ap.Watch(events.TypeEvicted, func(ev events.Event) error {
		cancelFn()
		return nil
	})

	ap.Watch(events.TypeMade, func(ev events.Event) error {
		cancelFn()
		return nil
	})

	if err := ap.Run(ctx, channel); err != nil {
		return fmt.Errorf("run autopilot: %w", err)
	}

	return nil
}

type MatchAccepter interface {
	AcceptMatch(context.Context, proto.Hash) error
}
