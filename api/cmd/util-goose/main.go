package main

import (
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/pressly/goose"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	_ "github.com/horizon-games/OpenSky/api/data/schema/migrations"
)

var (
	flags      = flag.NewFlagSet("goose", flag.ExitOnError)
	configFile = flags.String("config", "", "path to config file")
)

type gooseConfig struct {
	DB           config.DBConfig     `toml:"db"`
	DBMigrations config.DBMigrations `toml:"db-migrations"`
}

func main() {
	flags.Usage = usage

	if err := flags.Parse(os.Args[1:]); err != nil {
		log.Fatal(fmt.Errorf("parse flags: %w", err))
	}

	// Parse config file.
	cfg := &gooseConfig{}
	err := config.NewFromFile(*configFile, os.Getenv("CONFIG"), cfg)
	if err != nil {
		log.Fatal(err)
	}

	args := flags.Args()
	if len(args) != 1 {
		log.Fatal("no command provided")
	}

	if args[0] == "-h" || args[0] == "--help" {
		flags.Usage()
		return
	}

	// Must connect to the db
	data.MustNewDBSession(cfg.DB)

	if err := goose.SetDialect(cfg.DBMigrations.Driver); err != nil {
		log.Fatal(err)
	}

	cmd := args[0]
	loop := false
	if cmd == "up" {
		cmd = "up-by-one"
		loop = true
	}

	for {
		err := goose.Run(cmd, data.DB.Driver().(*sql.DB), cfg.DBMigrations.Dir)
		if err != nil {
			if errors.Is(err, goose.ErrNoNextVersion) || errors.Is(err, goose.ErrNoCurrentVersion) {
				break
			}

			log.Fatal(err)
		}

		if !loop {
			break
		}

		// New DB session for each loop. Fixes upper/db cache bug after schema changes.
		if err := data.DB.Close(); err != nil {
			log.Fatal(fmt.Errorf("close DB session: %w", err))
		}

		if _, err := data.NewDBSession(cfg.DB); err != nil {
			log.Fatal(fmt.Errorf("new DB session: %w", err))
		}
	}
}

func usage() {
	fmt.Print(usagePrefix)
	flags.PrintDefaults()
	fmt.Print(usageCommands)
}

var (
	usagePrefix = `
Usage: goose -config=FILE COMMAND

Options:
`

	usageCommands = `
Commands:
    up         Migrate the DB to the most recent version available
    down       Roll back the version by 1
    redo       Re-run the latest migration
    status     Dump the migration status for the current DB
    dbversion  Print the current version of the database
`
)
