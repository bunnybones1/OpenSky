package validators

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type ConquestValidator struct {
	minRankToPlayConquest proto.PlayerRank
}

func NewConquestValidator(cfg *config.Config) *ConquestValidator {
	return &ConquestValidator{
		minRankToPlayConquest: proto.PlayerRank(cfg.MatchMaker.MinRankToPlayConquest),
	}
}

func (v *ConquestValidator) IsValid(_ context.Context, client *frontend.Client, _ *messages.FindMatchMessage) (bool, error) {
	p := client.Player()

	if err := v.isRankValid(p); err != nil {
		return false, fmt.Errorf("validate rank: %w", err)
	}

	if p.ConquestInfo == nil {
		return false, fmt.Errorf("conquest info is missing")
	}

	if p.ConquestInfo.Status != proto.ConquestStatus_IN_PROGRESS {
		return false, fmt.Errorf("no conquest in progress")
	}

	if *p.ConquestInfo.DeckClass != p.DeckClass {
		return false, fmt.Errorf("deck class is not the same as conquest deck class")
	}

	return true, nil
}

func (v *ConquestValidator) isRankValid(p *player.Player) error {
	var discoveryRank, constructedRank proto.PlayerRank

	if p.Account.Stats != nil && p.Account.Stats.RankedConstructed != nil {
		constructedRank = p.Account.Stats.RankedConstructed.PlayerRank
	}

	if p.Account.Stats != nil && p.Account.Stats.RankedDiscovery != nil {
		discoveryRank = p.Account.Stats.RankedDiscovery.PlayerRank
	}

	if discoveryRank < v.minRankToPlayConquest && constructedRank < v.minRankToPlayConquest {
		return fmt.Errorf("rank is too low")
	}

	return nil
}
