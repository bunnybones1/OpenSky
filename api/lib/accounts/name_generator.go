package accounts

import (
	"errors"
	"fmt"

	"github.com/rs/zerolog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	randomNameFmt       = "OpenSky_%s"
	initialAddressChars = 5
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/name_generator.go -package mock . NameGenerator
type NameGenerator interface {
	GenerateFromAddress(db.Session, proto.Hash) (string, error)
}

type nameGenerator struct {
	logger              zerolog.Logger
	nameFmt             string
	initialAddressChars int
}

func NewNameGenerator(logger zerolog.Logger) *nameGenerator {
	return &nameGenerator{
		logger:              logger,
		nameFmt:             randomNameFmt,
		initialAddressChars: initialAddressChars,
	}
}

func (g *nameGenerator) GenerateFromAddress(sess db.Session, address proto.Hash) (string, error) {
	if !address.IsValidAddress() {
		return "", fmt.Errorf("addres is not valid")
	}

	name, err := g.generateFromAddress(sess, address, g.initialAddressChars)
	if err != nil {
		return "", fmt.Errorf("generate from address: %w", err)
	}

	return name, nil
}

func (g *nameGenerator) generateFromAddress(sess db.Session, address proto.Hash, chars int) (string, error) {
	if chars > len(address)-2 {
		return "", fmt.Errorf("name cannot be generated because it ran out of options")
	}

	name := fmt.Sprintf(g.nameFmt, address[2:chars+2])

	_, err := data.DB.Accounts(sess).FindByName(name)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return "", fmt.Errorf("find account by name: %w", err)
	}

	if errors.Is(err, db.ErrNoMoreRows) {
		return name, nil
	}

	return g.generateFromAddress(sess, address, chars+1)
}
