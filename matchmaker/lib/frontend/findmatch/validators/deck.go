package validators

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type DeckValidator struct {
	openskyAPI SkyWeaverAPI
}

func NewDeckValidator(openskyAPI SkyWeaverAPI) *DeckValidator {
	return &DeckValidator{
		openskyAPI: openskyAPI,
	}
}

func (v *DeckValidator) IsValid(ctx context.Context, client *frontend.Client, _ *messages.FindMatchMessage) (bool, error) {
	if client.Player().IsRandomDeck {
		return true, nil
	}

	isValid, err := v.openskyAPI.CheckDeck(ctx, client.Player().Address(), *client.Player().DeckString)
	if err != nil {
		return false, fmt.Errorf("check deck: %w", err)
	}

	if !isValid {
		return false, fmt.Errorf("invalid deck")
	}

	return true, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/opensky_api.go -package mock . SkyWeaverAPI
type SkyWeaverAPI interface {
	CheckDeck(ctx context.Context, address proto.Hash, deckString string) (bool, error)
}
