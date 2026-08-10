package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/honeybadger-io/honeybadger-go"

	"github.com/horizon-games/OpenSky/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/config"
)

var (
	flags      = flag.NewFlagSet("matchmaker", flag.ExitOnError)
	configFile = flags.String("config", "", "path to config file")
	version    = flags.Bool("version", false, "print version and exit")
)

func main() {
	defer honeybadger.Monitor()

	if err := flags.Parse(os.Args[1:]); err != nil {
		log.Fatal(fmt.Errorf("parse flags: %w", err))
	}

	if *version {
		fmt.Println(config.VERSION)
		os.Exit(1)
	}
	cfg := &config.Config{}
	err := config.NewFromFile(*configFile, os.Getenv("CONFIG"), cfg)
	if err != nil {
		log.Fatal(err)
	}

	// matchmaker new app
	app, err := matchmaker.New(cfg)
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		for range sig {
			cancel()
			return
		}
	}()

	err = app.Start(ctx)
	if err != nil {
		log.Fatal(err)
	}
}
