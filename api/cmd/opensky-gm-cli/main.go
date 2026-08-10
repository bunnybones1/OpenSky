package main

import (
	"fmt"

	"github.com/rs/zerolog/log"

	"github.com/horizon-games/OpenSky/api/cmd/opensky-gm-cli/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		log.Fatal().Err(fmt.Errorf("execute command: %w", err))
	}
}
