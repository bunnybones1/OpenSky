package matchmaker

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
)

type StatusService interface {
	Status() (*Status, error)
}

type Status struct {
	Queues         []*QueueStatus                         `json:"queues"`
	Config         config.MatchMakerConfig                `json:"config"`
	ServerInfo     map[string]*gameservers.GameServerInfo `json:"serverInfo"`
	ReleaseVersion string                                 `json:"releaseVersion"`
}

type QueueStatus struct {
	Name    string         `json:"name"`
	Size    int            `json:"size"`
	Players []PlayerStatus `json:"players,omitempty"`
}

type PlayerStatus struct {
	Username   string `json:"username"`
	GameMode   string `json:"gameMode"`
	WaitTimeMS uint   `json:"waitTimeMS"`
	ELO        struct {
		DiscoveryScore   int32 `json:"discovery"`
		ConstructedScore int32 `json:"constructed"`
	} `json:"elo"`
	Rank         uint32          `json:"rank"`
	Address      string          `json:"address"`
	ConquestInfo *proto.Conquest `json:"conquestInfo"`
}
