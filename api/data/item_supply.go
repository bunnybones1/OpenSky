package data

import "github.com/horizon-games/OpenSky/api/proto"

type ItemSupply struct {
	*proto.ItemSupply
}

func NewItemSupplyFromItem(item *Item) *ItemSupply {
	return &ItemSupply{ItemSupply: &proto.ItemSupply{
		ItemID:       item.ID,
		ItemType:     item.ItemType,
		TotalBalance: item.Balance,
	}}
}
