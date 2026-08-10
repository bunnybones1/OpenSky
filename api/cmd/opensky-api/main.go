package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/horizon-games/OpenSky/api"
	"github.com/horizon-games/OpenSky/api/config"
)

var (
	flags      = flag.NewFlagSet("opensky-api", flag.ExitOnError)
	configFile = flags.String("config", "", "path to config file")
	version    = flags.Bool("version", false, "print version and exit")
)

func main() {
	if err := flags.Parse(os.Args[1:]); err != nil {
		panic(fmt.Errorf("parse flags: %w", err))
	}

	if *version {
		fmt.Println(api.VERSION)
		os.Exit(1)
	}

	cfg := &config.Config{}
	err := config.NewFromFile(*configFile, os.Getenv("CONFIG"), cfg)
	if err != nil {
		log.Fatal(err)
	}

	apiService, err := api.New(cfg)
	if err != nil {
		log.Fatal(err)
	}

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		for range sig {
			apiService.Stop()
		}
	}()

	err = apiService.Start()
	if err != nil && errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
