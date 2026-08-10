package gameservers

import "fmt"

type GameServerInfo struct {
	Name             string         `json:"name"`
	Status           string         `json:"status"`
	Load             GameServerLoad `json:"load"`
	Hostname         string         `json:"hostname,omitempty"`
	InternalHostname string         `json:"internalHostname,omitempty"`
	Port             int            `json:"port,omitempty"`
	WS               string         `json:"ws,omitempty"`
	HTTP             string         `json:"http,omitempty"`
	InternalHTTP     string         `json:"internalHttp,omitempty"`
	ReleaseVersion   string         `json:"releaseVersion,omitempty"`
	Error            string         `json:"error,omitempty"`
}

func (g GameServerInfo) WebSocketURL() string {
	if g.WS == "" {
		return ""
	}

	return fmt.Sprintf("%s?release=%s", g.WS, g.ReleaseVersion)
}

type GameServerLoad struct {
	InProgressMatches int `json:"inProgressMatches"`
	MaxCapacity       int `json:"maxCapacity"`
	CompletedMatches  int `json:"completedMatches"`
}
