package migrations

import (
	"database/sql"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/pressly/goose"
	db "github.com/upper/db/v4"
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

	res := data.Matches(sess).Find().OrderBy("id")

	var matches []data.Match
	err = res.All(&matches)
	if err != nil {
		return err
	}

	p1Classes := make(map[proto.DeckClass][]uint64)
	p2Classes := make(map[proto.DeckClass][]uint64)

	for _, m := range matches {
		_, deckClass, _, err := data.DecodeDeckString(m.Player1DeckString)
		if err != nil {
			ids, _ := p1Classes[deckClass]
			p1Classes[deckClass] = append(ids, m.ID)
		}

		_, deckClass, _, err = data.DecodeDeckString(m.Player2DeckString)
		if err != nil {
			ids, _ := p2Classes[deckClass]
			p2Classes[deckClass] = append(ids, m.ID)
		}
	}

	for class, ids := range p1Classes {
		for i := 0; i < len(ids); i += 1000 {
			num := 1000
			if i+num > len(ids) {
				num = len(ids) - i
			}

			upd := ids[i : i+num]

			err := data.Matches(sess).Find(db.Cond{"id": db.AnyOf(upd)}).Update(map[string]interface{}{"p1_deck_class": class})
			if err != nil {
				return err
			}
		}
	}

	for class, ids := range p2Classes {
		for i := 0; i < len(ids); i += 1000 {
			num := 1000
			if i+num > len(ids) {
				num = len(ids) - i
			}

			upd := ids[i : i+num]

			err := data.Matches(sess).Find(db.Cond{"id": db.AnyOf(upd)}).Update(map[string]interface{}{"p2_deck_class": class})
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func Down(tx *sql.Tx) error {
	return nil
}
