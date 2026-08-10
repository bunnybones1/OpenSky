package mockservices

import (
	"context"
	"fmt"
	"os"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

const (
	numMockGameServers = 5
)

type Services struct {
	Cfg    *config.Config
	Logger zerolog.Logger

	APIServer   *APIServer
	GameServers []*GameServer
}

func NewServices(cfg *config.Config) *Services {
	mock := &Services{}

	mock.Cfg = cfg

	logLevel, err := zerolog.ParseLevel(cfg.Logging.Level)
	if err != nil {
		panic(fmt.Sprintf("parse log level %q: %v", cfg.Logging.Level, err))
	}

	mock.Logger = zerolog.New(os.Stderr).With().Timestamp().Logger().Level(logLevel)

	return mock
}

func (s *Services) Start(ctx context.Context) error {
	var err error

	// start mock API server
	s.APIServer, err = NewAPIServer()
	if err != nil {
		return err
	}

	addr, err := s.APIServer.Start(s.Cfg)
	if err != nil {
		return err
	}

	s.Cfg.SkyWeaverAPI.URI = fmt.Sprintf("http://%s", addr)

	// start game servers
	s.GameServers = []*GameServer{}
	for i := 0; i < numMockGameServers; i++ {
		gameServer, err := s.NewMockGameServer()
		if err != nil {
			return err
		}

		s.GameServers = append(s.GameServers, gameServer)
	}

	// wait until receiving stop signal
	go func() {
		<-ctx.Done()
		s.Stop()
	}()

	return nil
}

func (s *Services) Stop() {
	if s.APIServer != nil {
		if err := s.APIServer.Stop(); err != nil {
			s.Logger.Err(err).Msg("stop api server")
		}
	}

	for i := range s.GameServers {
		if err := s.GameServers[i].Stop(); err != nil {
			s.Logger.Err(err).Msg("stop game server")
		}
	}
}

func (s *Services) NewMockGameServer() (*GameServer, error) {
	g, err := NewGameServer()
	if err != nil {
		return nil, err
	}

	_, err = g.Start(s.Cfg)
	if err != nil {
		return nil, err
	}

	return g, nil
}

func (s *Services) AdvertiseGameServers(keyValStore store.Store) error {
	var gameServers []string

	for i, gameServer := range s.GameServers {
		info, err := gameServer.Info()
		if err != nil {
			return err
		}

		// register mock game server
		key := fmt.Sprintf("game_server:%040d:release_version:dev", i+1)

		if err = keyValStore.Store(key, *info); err != nil {
			return err
		}

		gameServers = append(gameServers, key)
	}

	if err := keyValStore.Store("game_server_ranking", gameServers); err != nil {
		return err
	}

	return nil
}
