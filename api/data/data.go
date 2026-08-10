package data

import (
	"os/exec"
	"time"

	"os"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/pkg/errors"
)

var (
	RepoRootDir = os.Getenv("GOPATH") + "/src/github.com/horizon-games/OpenSky/api"
)

func init() {
	// Set UTC timezone for all our data models & ignore TZ coming from OS env.
	time.Local = time.UTC
}

func InitDBAndImport(cfg config.DBConfig) error {
	// TODO: panic if running in prod mode
	cmd := exec.Command("./scripts/db.sh", "import", cfg.Database, "./data/schema/schema.sql")
	cmd.Dir = RepoRootDir
	_, err := cmd.Output()
	if err != nil {
		if e, ok := err.(*exec.ExitError); ok {
			return errors.Wrap(errors.Wrap(err, string(e.Stderr)), "failed to import schema.sql and init.sql")
		}
		return errors.Wrap(err, "failed to run db.sh script")
	}

	// Connect to DB
	_, err = NewDBSession(cfg)
	if err != nil {
		return errors.Wrap(err, "failed to connect to DB")
	}

	// Test DB connection
	if err = DB.Ping(); err != nil {
		return errors.Wrap(err, "failed to ping DB")
	}

	return nil
}

func TimeNowUTC() time.Time {
	return time.Now().UTC().Truncate(time.Second)
}

func TimeNowUTCPtr() *time.Time {
	t := TimeNowUTC()
	return &t
}
