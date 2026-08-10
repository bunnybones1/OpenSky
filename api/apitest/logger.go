package apitest

import (
	"os"

	"github.com/rs/zerolog"
)

func NewLogger() zerolog.Logger {
	return zerolog.New(os.Stderr)
}
