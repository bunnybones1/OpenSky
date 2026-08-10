package mockservices

import (
	"fmt"
	"log"
	"net"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/httplog"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
)

var (
	ErrNotImplemented = fmt.Errorf("not implemented")
)

type APIServer struct {
	Address string

	li  net.Listener
	rpc proto.WebRPCServer
}

func NewAPIServer() (*APIServer, error) {
	s := &APIServer{}
	s.rpc = proto.NewSkyWeaverAPIServer(&openskyAPIServer{})
	return s, nil
}

func (s *APIServer) Start(cfg *config.Config) (string, error) {
	if s.li != nil {
		return s.li.Addr().String(), nil
	}

	var err error
	s.li, err = net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", err
	}

	if cfg == nil {
		var configFile config.Config
		err = config.NewFromFile(
			"../../etc/matchmaker.test.conf",
			"development",
			&configFile,
		)
		if err != nil {
			panic(fmt.Sprintf("config.NewFromFile: %v", err))
		}

		cfg = &configFile
	}

	logLevel, err := zerolog.ParseLevel(cfg.Logging.Level)
	if err != nil {
		panic(fmt.Sprintf("parse log level %q: %v", cfg.Logging.Level, err))
	}

	logger := httplog.NewLogger("mock-api-server", httplog.Options{}).Level(logLevel)

	r := chi.NewRouter()
	r.Use(httplog.RequestLogger(logger))
	r.Handle("/*", s.rpc)

	go func(handler http.Handler) {
		err := http.Serve(s.li, handler)
		log.Printf("http.Serve: %v", err)
	}(r)

	return s.li.Addr().String(), nil
}

func (s *APIServer) Stop() error {
	_ = s.li.Close()

	return nil
}
