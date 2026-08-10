package matchhandlers

import (
	"context"
	"fmt"
	"time"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/metrics"
)

type PVPFindMatchProcessor struct {
	matchmakerBackendService matchmaker.BackendService
	playersCount             int
}

func NewPVPFindMatchProcessor(matchmakerBackendService matchmaker.BackendService) *PVPFindMatchProcessor {
	return &PVPFindMatchProcessor{
		matchmakerBackendService: matchmakerBackendService,
		playersCount:             2,
	}
}

func (h *PVPFindMatchProcessor) ProcessMatch(ctx context.Context, matchProposal *matchmaker.MatchProposal) error {
	if matchProposal.PlayersCount() != h.playersCount {
		return fmt.Errorf("expected %d players, got %d instead", h.playersCount, matchProposal.PlayersCount())
	}

	for _, p := range matchProposal.Players {
		if !p.IsBot() {
			metrics.RecordQueueWaitTime(p.Mode, *p.InitTimestamp, time.Now())
		}
	}

	matchProcessedData := matchmaker.MatchProcessedData{
		MatchProposal: matchProposal,
	}

	if err := h.matchmakerBackendService.MatchFound(ctx, matchProcessedData); err != nil {
		return fmt.Errorf("send match found: %w", err)
	}

	return nil
}
