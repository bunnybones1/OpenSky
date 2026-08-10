package mockservices

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/httplog"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
)

type GameServer struct {
	li net.Listener
}

func NewGameServer() (*GameServer, error) {
	s := &GameServer{}
	return s, nil
}

func (s *GameServer) Start(cfg *config.Config) (string, error) {
	if s.li != nil {
		return s.li.Addr().String(), nil
	}

	var err error
	s.li, err = net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", err
	}

	logLevel, err := zerolog.ParseLevel(cfg.Logging.Level)
	if err != nil {
		panic(fmt.Sprintf("parse log level %q: %v", cfg.Logging.Level, err))
	}

	logger := httplog.NewLogger("mock-game-server", httplog.Options{}).Level(logLevel)

	r := chi.NewRouter()
	r.Use(httplog.RequestLogger(logger))
	r.Post("/createMatch", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
	})
	r.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	go func(handler http.Handler) {
		err := http.Serve(s.li, handler)
		log.Printf("http.Serve: %v", err)
	}(r)

	return s.li.Addr().String(), nil
}

func (s *GameServer) Info() (*gameservers.GameServerInfo, error) {
	addr := s.li.Addr().String()

	_, portValue, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}

	port, _ := strconv.Atoi(portValue)

	// create game server
	gameServerInfo := gameservers.GameServerInfo{
		Status:           "running",
		Name:             "mock-game-server",
		Hostname:         addr,
		InternalHostname: addr,
		Port:             port,
		WS:               "ws://" + addr,
		HTTP:             "http://" + addr,
		InternalHTTP:     "http://" + addr,
		ReleaseVersion:   "dev",
	}
	gameServerInfo.Load.InProgressMatches = 0
	gameServerInfo.Load.MaxCapacity = 50

	return &gameServerInfo, nil
}

func (s *GameServer) Stop() error {
	_ = s.li.Close()

	return nil
}
