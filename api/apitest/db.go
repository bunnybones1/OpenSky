//go:build integration

package apitest

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/rpc/middleware"
)

func DBContext(ctx context.Context) context.Context {
	repo := &data.Database{
		Session: data.DB.Session.WithContext(ctx),
	}

	return context.WithValue(ctx, middleware.DatabaseCtxKey, repo)
}

func TruncateAll() {
	// Truncating tables
	collections, err := data.DB.Collections()
	if err != nil {
		log.Fatal("data.DB.Collections: ", err)
	}

	for i := range collections {
		// It is a view, not a table.
		if collections[i].Name() == "normalized_signals_pivot" {
			continue
		}

		// It is a view, not a table.
		if collections[i].Name() == "signals_pivot" {
			continue
		}

		// It is a view, not a table.
		if collections[i].Name() == "normalized_signal_values" {
			continue
		}

		if collections[i].Name() == "cards" {
			// NOTE: index >= 20000 cards are just mock cards
			err := data.DB.Cards(nil).Find(db.Cond{"id": db.Gte(20000)}).Delete()
			if err != nil {
				log.Fatal("data.DB.SQL().Exec: ", err)
			}

			continue
		}

		if collections[i].Name() == "weekly_golds" {
			// this is filled by a migration
			continue
		}

		_, err := data.DB.SQL().Exec(fmt.Sprintf(`TRUNCATE TABLE %q CASCADE`, collections[i].Name()))
		if err != nil {
			if strings.Contains(err.Error(), "is not a table") {
				continue
			}

			log.Fatal("data.DB.SQL().Exec: ", err)
		}
	}
}
