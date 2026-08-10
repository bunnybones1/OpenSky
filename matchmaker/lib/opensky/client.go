package opensky

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/httpclient"
)

func NewClient(cfg *config.Config) proto.SkyWeaverAPI {
	httpClient := httpclient.NewWithInsecure(cfg.SkyWeaverAPI.AllowInsecureTLS)
	client := proto.NewSkyWeaverAPIClient(cfg.SkyWeaverAPI.URI, httpClient)

	return client
}
