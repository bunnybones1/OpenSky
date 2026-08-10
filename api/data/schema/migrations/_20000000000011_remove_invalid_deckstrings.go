package migrations

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/pressly/goose"
	"github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/postgresql"
)

func init() {
	goose.AddMigration(Up, Down)
}

func Up(tx *sql.Tx) error {
	sess, err := postgresql.NewTx(tx)
	if err != nil {
		return err
	}

	err = data.CardIndex.Sync()
	if err != nil {
		return err
	}

	res := data.Decks(sess).Find().OrderBy("created_at")

	var decks []data.Deck
	err = res.All(&decks)
	if err != nil {
		return err
	}

	invalid, valid := 0, 0
	for i := range decks {
		_, _, _, err := data.DecodeDeckString(decks[i].DeckString)
		if err != nil {
			if err := data.Decks(sess).Find(db.Cond{"uuid": decks[i].UUID}).Delete(); err != nil {
				return fmt.Errorf("failed to remove deck %v: %v", decks[i].UUID, err)
			}
			log.Printf("invalid deck %v: %v", decks[i].UUID, err)
			invalid++
		} else {
			//log.Printf("valid deck: %v", *decks[i].CreatedAt)
			valid++
		}
	}

	log.Printf("got %d and %d invalid decks", valid, invalid)
	return nil
}

func Down(tx *sql.Tx) error {
	return nil
}
