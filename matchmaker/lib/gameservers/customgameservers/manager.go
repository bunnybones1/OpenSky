package customgameservers

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
)

type Manager struct {
	logger           zerolog.Logger
	serverRepository ServerRepository
	client           *Client
}

func NewManager(logger zerolog.Logger, serverRepository ServerRepository, client *Client) *Manager {
	return &Manager{
		logger:           logger.With().Str("fn", "customgameservers.Manager").Logger(),
		serverRepository: serverRepository,
		client:           client,
	}
}

func (m *Manager) Find(ctx context.Context, versionHash string) (*gameservers.GameServerInfo, error) {
	servers, err := m.listServers(versionHash)
	if err != nil {
		return nil, fmt.Errorf("list servers: %w", err)
	}

	if len(servers) == 0 {
		return nil, fmt.Errorf("no game servers are available")
	}

	for _, server := range servers {
		healthy, err := m.client.HealthCheck(ctx, server)
		if err != nil {
			m.logger.Err(err).Str("server.name", server.Name).Msg("game server is unhealthy")
			continue
		}

		if healthy {
			return server, nil
		}
	}

	return nil, fmt.Errorf("no healthy game servers are available")
}

func (m *Manager) ListInfo() (map[string]*gameservers.GameServerInfo, error) {
	serverKeys, err := m.serverRepository.List()
	if err != nil {
		return nil, fmt.Errorf("list game servers: %w", err)
	}

	if len(serverKeys) == 0 {
		return nil, fmt.Errorf("no game servers found")
	}

	servers := make(map[string]*gameservers.GameServerInfo)

	var invalidKeys []string

	for _, serverKey := range serverKeys {
		gameServerInfo, err := m.serverRepository.GetInfo(serverKey)
		if err != nil {
			servers[serverKey] = &gameservers.GameServerInfo{
				Error:  err.Error(),
				Status: "unknown",
			}

			invalidKeys = append(invalidKeys, serverKey)

			continue
		}

		if gameServerInfo == nil {
			invalidKeys = append(invalidKeys, serverKey)

			continue
		}

		servers[serverKey] = gameServerInfo
	}

	if err := m.serverRepository.Delete(invalidKeys...); err != nil {
		m.logger.Err(err).Msg("delete invalid game servers")
	}

	return servers, nil
}

func (m *Manager) listServers(versionHash string) ([]*gameservers.GameServerInfo, error) {
	serverKeys, err := m.serverRepository.ListByVersion(versionHash)
	if err != nil {
		return nil, fmt.Errorf("list game servers by version: %w", err)
	}

	var servers []*gameservers.GameServerInfo

	var invalidKeys []string

	for _, serverKey := range serverKeys {
		serverInfo, err := m.serverRepository.GetInfo(serverKey)
		if err != nil {
			m.logger.Err(err).Msgf("retrieve game server info")
			continue
		}

		if serverInfo == nil {
			m.logger.Err(err).Msgf("game server %q does not exist", serverKey)
			invalidKeys = append(invalidKeys, serverKey)
			continue
		}

		if serverInfo.Status != "running" {
			m.logger.Error().Msgf("server (%s) reported an incompatible status: %s", serverInfo.Name, serverInfo.Status)
			continue
		}

		if serverInfo.Load.InProgressMatches >= serverInfo.Load.MaxCapacity {
			m.logger.Warn().Msgf("server (%s) is overloaded (%d/%d)", serverInfo.Name, serverInfo.Load.InProgressMatches, serverInfo.Load.MaxCapacity)
			continue
		}

		servers = append(servers, serverInfo)
	}

	if err := m.serverRepository.Delete(invalidKeys...); err != nil {
		m.logger.Err(err).Msg("delete invalid game servers")
	}

	return servers, nil
}

func (m *Manager) InitiateMatch(ctx context.Context, gameServer *gameservers.GameServerInfo, request gameservers.MatchRequest) error {
	if len(request.Players) != 2 {
		return fmt.Errorf("expected 2 players, got %d instead", len(request.Players))
	}

	ok, err := m.client.InitiateMatch(
		ctx,
		request.MatchID,
		request.ReplayID,
		request.Players[0],
		request.Players[1],
		gameServer,
		request.Season,
	)
	if err != nil {
		return fmt.Errorf("initiate match: %w", err)
	}

	if !ok {
		return fmt.Errorf("match not intiated")
	}

	return nil
}

type ServerRepository interface {
	ListByVersion(versionHash string) (serverKeys []string, err error)

	List() (serverKeys []string, err error)
	GetInfo(serverKey string) (*gameservers.GameServerInfo, error)
	Delete(serverKeys ...string) error
}
