package decks

import (
	"errors"
	"fmt"

	"github.com/rs/zerolog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type Updater struct {
	logger zerolog.Logger
}

func NewUpdater(logger zerolog.Logger) *Updater {
	return &Updater{
		logger: logger,
	}
}

func (u *Updater) Update(sess db.Session, accountID proto.AccountID, req *proto.UpdateDeckRequest) (*data.Deck, error) {
	if err := u.validateRequest(req); err != nil {
		return nil, fmt.Errorf("validate request: %w", err)
	}

	var err error
	var existingDeck *data.Deck

	if req.UUID != nil && *req.UUID != "" {
		existingDeck, err = data.DB.Decks(sess).FindOne(db.Cond{
			"uuid":       req.UUID,
			"account_id": accountID,
		})
	} else if req.DeckString != nil && *req.DeckString != "" {
		existingDeck, err = data.DB.Decks(sess).FindOne(db.Cond{
			"deck_string": req.DeckString,
			"account_id":  accountID,
		})
	}
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find deck: %w", err)
	}

	if existingDeck == nil {
		return nil, fmt.Errorf("deck does not exist")
	}

	if existingDeck.DeckType == proto.DeckType_LOCKED_STARTER {
		return nil, fmt.Errorf("deck not unlocked")
	}

	existingDeck.IsNew = false

	newDeck, err := data.NewDeckByDeckString(req.Deck.Name, req.Deck.DeckString)
	if err != nil {
		return nil, fmt.Errorf("deck by deck string: %w", err)
	}

	if req.Deck.Art != nil {
		newDeck.Art = *req.Deck.Art
	}

	existingDeck = existingDeck.Merge(newDeck.Deck)

	if err = sess.Save(existingDeck); err != nil {
		return nil, err
	}

	return existingDeck, nil
}

func (u *Updater) validateRequest(req *proto.UpdateDeckRequest) error {
	if (req.UUID == nil || *req.UUID == "") && (req.DeckString == nil || *req.DeckString == "") {
		return fmt.Errorf("invalid deck update request, missing argument uuid or deck string")
	}

	if req.Deck.DeckString == "" {
		return fmt.Errorf("expecting a deck string in the update request")
	}

	return nil
}
