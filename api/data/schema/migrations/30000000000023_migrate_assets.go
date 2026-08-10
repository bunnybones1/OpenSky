package migrations

import (
	"database/sql"
	"fmt"

	"github.com/pressly/goose"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/postgresql"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/horizon-games/OpenSky/api/proto"
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

	res := data.DB.Decks(sess).Find().OrderBy("created_at")

	var decks []data.Deck
	err = res.All(&decks)
	if err != nil {
		return err
	}

	decksPerPercent := len(decks) / 100

	for i := range decks {
		var deck, migrateErr, encodingErr = deckstring.MigrateVer01DeckString(decks[i].DeckString)

		if i%decksPerPercent == 0 {
			log.Info().Msgf("migrated %d%% decks", i/decksPerPercent)
		}

		decks[i].DeckString = deck
		ids, idsErr := deckstring.MigrateVer01CardIDs(decks[i].CardIDs)
		if err != nil {
			log.Warn().Msgf("failed to migrate %s with %v", decks[i].DeckString, err)
		}

		decks[i].CardIDs = ids

		if migrateErr == nil && encodingErr == nil && idsErr == nil {
			if err := data.DB.Decks(sess).Find(db.Cond{"uuid": decks[i].UUID}).Update(&decks[i]); err != nil {
				return fmt.Errorf("failed to update ids in deck %v: %v", decks[i].UUID, err)
			}
		} else {
			// bad deck, kill it!
			if err := data.DB.Decks(sess).Find(db.Cond{"uuid": decks[i].UUID}).Delete(); err != nil {
				return fmt.Errorf("failed to remove bad deck %v: %v", decks[i].UUID, err)
			}
		}
	}

	res = data.DB.DeckRanks(sess).Find().OrderBy("created_at")

	var deckRanks []data.DeckRank
	err = res.All(&deckRanks)
	if err != nil {
		return err
	}
	ranksPerPercent := len(deckRanks) / 100

	for i := range deckRanks {
		var oldDeckString = deckRanks[i].DeckString
		var oldCardsVersion = deckRanks[i].CardsRevision
		var deck, migrateErr, encodingErr = deckstring.MigrateVer01DeckString(deckRanks[i].DeckString)

		if i%ranksPerPercent == 0 {
			log.Info().Msgf("migrated %d%% deck ranks", i/ranksPerPercent)
		}

		deckRanks[i].DeckString = deck
		ids, idsErr := deckstring.MigrateVer01CardIDs(deckRanks[i].CardIDs)
		deckRanks[i].CardIDs = ids

		if migrateErr == nil && encodingErr == nil && idsErr == nil {
			if err := data.DB.DeckRanks(sess).Find(db.Cond{"deck_string": oldDeckString, "cards_revision": oldCardsVersion}).Update(&deckRanks[i]); err != nil {
				return fmt.Errorf("failed to update ids in deck rank %v %v: %v", oldDeckString, oldCardsVersion, err)
			}
		} else {
			// bad deck, kill it!
			if err := data.DB.DeckRanks(sess).Find(db.Cond{"deck_string": oldDeckString, "cards_revision": oldCardsVersion}).Delete(); err != nil {
				return fmt.Errorf("failed to remove bad deck rank %v %v: %v", oldDeckString, oldCardsVersion, err)
			}
		}
	}

	res = data.DB.FeedEvents(sess).Find().OrderBy("created_at")

	var feedEvents []data.FeedEvent
	err = res.All(&feedEvents)
	if err != nil {
		return err
	}
	eventsPerPercent := len(feedEvents) / 100

	for i := range feedEvents {
		ids, idsErr := deckstring.MigrateVer01CardIDs(feedEvents[i].TokenIDs)

		if i%eventsPerPercent == 0 {
			log.Info().Msgf("migrated %d%% feed events", i/eventsPerPercent)
		}

		feedEvents[i].TokenIDs = ids
		cardsErr := deckstring.MigrateVer01Cards(feedEvents[i].Cards)

		if idsErr == nil && cardsErr == nil {

			if err := data.DB.FeedEvents(sess).Find(db.Cond{"id": feedEvents[i].ID}).Update(&feedEvents[i]); err != nil {
				return fmt.Errorf("failed to update feed event %v: %v", feedEvents[i].ID, err)
			}
		} else {
			// bad feed event! kill it!
			if err := data.DB.FeedEvents(sess).Find(db.Cond{"id": feedEvents[i].ID}).Delete(); err != nil {
				return fmt.Errorf("failed to kill bad feed event %v: %v", feedEvents[i].ID, err)
			}
		}
	}

	// delete everything other than base cards and heroes
	currentCardIDs := data.CardIndex.IDs.List()
	err = data.DB.Items(sess).Find(db.Cond{
		"item_type": db.NotIn(
			proto.ItemType_SW_BASE_CARDS,
			proto.ItemType_SW_HERO,
		),
	}).Delete()
	if err != nil {
		return err
	}

	// bump all card IDs to avoid index conflict when updating
	_, err = sess.SQL().Exec("UPDATE items SET token_id = token_id + 1000000 WHERE item_type = ?", proto.ItemType_SW_BASE_CARDS)
	if err != nil {
		return err
	}

	ver01to02map := deckstring.GetVer01IDMap()
	for oldID, newID := range ver01to02map {
		_, err = sess.SQL().Exec("UPDATE items SET token_id = ? WHERE token_id = ? AND item_type = ?", newID, oldID+1000000, proto.ItemType_SW_BASE_CARDS)
		if err != nil {
			return err
		}
	}

	// delete base cards that are not currently active
	err = data.DB.Items(sess).Find(db.Cond{
		"token_id":  db.NotAnyOf(currentCardIDs),
		"item_type": proto.ItemType_SW_BASE_CARDS,
	}).Delete()
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("TRUNCATE item_summaries")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("insert into item_summaries (account_address, item_type, total_amount_latest, total_amount_confirmed, updated_at, created_at) select account_address, item_type, sum(amount_latest), sum(amount_confirmed), max(updated_at), min(created_at) FROM items WHERE item_type = 300 GROUP BY 1, 2")
	if err != nil {
		return err
	}

	res = data.DB.Matches(sess).Find().OrderBy("created_at")
	var matches []data.Match
	err = res.All(&matches)
	if err != nil {
		return err
	}

	matchesPerPercent := len(matches) / 100

	for i := range matches {
		var match = matches[i]

		if i%matchesPerPercent == 0 {
			log.Info().Msgf("migrated %d%% matches", i/matchesPerPercent)
		}

		// If we failed to migrate some cards, that's OK, because they're just removed from the deck string.
		initP1String, _, encodeErr := deckstring.MigrateVer01DeckString(match.InitPlayer1DeckString)
		if encodeErr != nil {
			return encodeErr
		}

		match.InitPlayer1DeckString = initP1String

		// If we failed to migrate some cards, that's OK, because they're just removed from the deck string.
		initP2String, _, encodeErr := deckstring.MigrateVer01DeckString(match.InitPlayer2DeckString)
		if encodeErr != nil {
			return encodeErr
		}

		match.InitPlayer2DeckString = initP2String

		if len(match.Player1DeckString) > 0 {
			// If we failed to migrate some cards, that's OK, because they're just removed from the deck string.
			p1string, _, encodeErr := deckstring.MigrateVer01DeckString(match.Player1DeckString)
			if encodeErr != nil {
				return encodeErr
			}

			match.Player1DeckString = p1string
		}

		if len(match.Player2DeckString) > 0 {
			// If we failed to migrate some cards, that's OK, because they're just removed from the deck string.
			p2string, _, encodeErr := deckstring.MigrateVer01DeckString(match.Player2DeckString)
			if encodeErr != nil {
				return encodeErr
			}

			match.Player2DeckString = p2string
		}

		if err := data.DB.Matches(sess).Find(db.Cond{"id": matches[i].ID}).Update(&matches[i]); err != nil {
			return fmt.Errorf("failed to update match %v: %v", matches[i].ID, err)
		}
	}

	return nil
}

func Down(_ *sql.Tx) error {
	return nil
}
