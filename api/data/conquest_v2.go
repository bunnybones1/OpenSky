package data

import "github.com/horizon-games/OpenSky/api/proto"

type ConquestV2TreasureProgress struct {
	*proto.ConquestV2TreasureProgress

	Weight          float32
	PointsAccounted uint64
}
