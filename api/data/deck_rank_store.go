package data

import (
	db "github.com/upper/db/v4"
)

type DeckRankStore struct {
	db.Collection
}

func (s *DeckRankStore) FindCurrent(conds ...db.LogicalExpr) db.Result {
	return s.Find(db.And(conds...).And(db.Cond{
		"cards_revision": cardsRevision,
	}))
}

func (s *DeckRankStore) FindCurrentStatsByDeckstring(deckstring string) (*DeckRank, error) {
	var rank *DeckRank
	err := s.Find(db.Cond{
		"cards_revision": cardsRevision,
		"deck_string":    deckstring,
	}).One(&rank)

	return rank, err
}
