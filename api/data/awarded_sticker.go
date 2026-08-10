package data

import (
	"errors"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type AwardedSticker struct {
	AccountID proto.AccountID `db:"account_id"`
	TokenID   uint64          `db:"token_id"`
	Season    uint16          `db:"season"`
}

func (s *AwardedSticker) Store(sess db.Session) db.Store {
	return DB.AwardedStickers(sess)
}

var (
	_ interface {
		db.Record
	} = &Sticker{}
)

type AwardedStickersStore struct {
	db.Collection
}

func (s *AwardedStickersStore) FindAllUnawardedStickers(accountID proto.AccountID, season uint16) ([]*Sticker, error) {
	var stickers []*Sticker

	err := s.Session().SQL().
		SelectFrom("stickers s").
		Where(`
			season = ?
			AND token_id NOT IN (
				SELECT token_id
				FROM awarded_stickers
				WHERE
					account_id = ?
					AND season = ?
			)`, season, accountID, season).
		All(&stickers)
	if err != nil {
		return nil, err
	}

	return stickers, nil
}

func (s *AwardedStickersStore) FindHighestCostAwardedSticker(accountID proto.AccountID, season uint16) (*Sticker, error) {
	var sticker *Sticker

	err := s.Session().SQL().
		SelectFrom("stickers s").
		Where(`
			season = ?
			AND token_id IN (
				SELECT token_id
				FROM awarded_stickers
				WHERE
					account_id = ?
					AND season = ?
			)`, season, accountID, season).
		OrderBy("-required_points").
		One(&sticker)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, err
	}

	return sticker, nil
}
