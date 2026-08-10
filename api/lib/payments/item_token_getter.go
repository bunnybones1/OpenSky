package payments

import (
	"fmt"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type ItemTokenGetterImpl struct {
}

func NewItemTokenGetterImpl() *ItemTokenGetterImpl {
	return &ItemTokenGetterImpl{}
}

func (g *ItemTokenGetterImpl) GetToken(itemType proto.ItemType) (uint64, error) {
	switch itemType {
	case proto.ItemType_SW_CONQUEST_TICKET:
		return data.ConquestTicketTokenID, nil
	case proto.ItemType_SW_SKYPASS:
		return data.SkypassTokenID(data.CurrentSeason()), nil
	default:
		return 0, fmt.Errorf("unsupported item type: %s", itemType)
	}
}
