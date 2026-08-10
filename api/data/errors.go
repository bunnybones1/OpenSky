package data

import (
	"errors"
	"fmt"
)

var (
	ErrMissingAddress = errors.New("missing proof address")
	ErrUnauthorized   = errors.New("unauthorized")
)

func errMissingParam(name string) error {
	return fmt.Errorf("missing parameter %q", name)
}
