package playerstats

import (
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
)

type Stat struct {
	Hero         proto.Hero `json:"hero"`
	OpponentHero proto.Hero `json:"opponent_hero"`
	OpponentID   proto.Hash `json:"opponent_id"`
	Timestamp    time.Time  `json:"timestamp"`
}

type StatsSummary struct {
	VsHeroProbability   map[proto.Hero]float64 `json:"vs_hero_probability"`
	VsPlayerProbability map[proto.Hash]float64 `json:"vs_player_probability"`
	Stats               []Stat                 `json:"stats"`
}
