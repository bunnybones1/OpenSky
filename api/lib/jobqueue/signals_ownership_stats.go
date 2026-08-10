package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/rs/zerolog/log"
	"github.com/scylladb/go-set/u64set"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/signals"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	UpdateOwnershipStatsQueue = "signals:ownership stats"
)

type UpdateOwnershipStats struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	MatchID        uint64          `json:"match_id"`
	Score          int32           `json:"score"`
}

type deckStats struct {
	Deck            *data.Deck
	CardsOwnedPerc  float64
	BannedOwners    int64
	NotBannedOwners int64
}

func (t UpdateOwnershipStats) Hash() string {
	return fmt.Sprintf("%d-%d-%d", t.AccountID, t.MatchID, t.Score)
}

func updateOwnershipStats(_ context.Context, sess db.Session, task *data.Task) error {
	payload := UpdateOwnershipStats{}
	err := json.Unmarshal(task.Payload, &payload)
	if err != nil {
		log.Error().Msgf("failed unmarshalling detect short match duration payload with: %v", err)
		return err
	}

	accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
	if err != nil {
		log.Err(err).Msgf("get account ID")
		UpdateFailedTasks([]*data.Task{task}, 0, 0)

		return fmt.Errorf("get account ID: %w", err)
	}

	rows, err := data.DB.Session.SQL().Query(`
		SELECT
			token_id,
			item_type,
			SUM(balance) AS cards_owned
		FROM
			items
		WHERE
			account_id = ?
			AND item_type IN (300, 401, 402)
			AND balance < 10000
		GROUP BY 1, 2`, accountID)

	if err != nil {
		log.Error().Msgf("failed fetching cards with: %v", err)
		return err
	}

	var baseCards, silverCards, goldCards int64
	cardsOwned := u64set.New()

	var tokenID, balance int64
	var itemType proto.ItemType

	for rows.Next() {
		err = rows.Scan(&tokenID, &itemType, &balance)
		if err != nil {
			log.Error().Msgf("failed card ownership with: %v", err)
			return err
		}

		switch itemType {
		case proto.ItemType_SW_BASE_CARDS:
			baseCards += balance

		case proto.ItemType_SW_SILVER_CARDS:
			silverCards += balance

		case proto.ItemType_SW_GOLD_CARDS:
			goldCards += balance
		}

		cardsOwned.Add(uint64(tokenID))
	}

	constructedUnlockedCardsDummy := 100
	exists, err := data.DB.AccountSignals(sess).Find(db.Cond{"account_id": accountID, "signal_type": signals.MATCHES_PLAYED_CONSTRUCTED, "ml_value": db.Gt(0.0), "signal_status": 0}).Exists()
	if err != nil {
		log.Error().Msgf("failed checking if account played conquest with: %v", err)
		return err
	}
	if exists {
		constructedUnlockedCardsDummy = cardsOwned.Size()
	}

	err = cleanupSignals(nil, accountID,
		signals.CARDS_UNLOCKED_PLAYED_CONSTRUCTED,
		signals.CARDS_UNLOCKED,
		signals.BASE_CARDS_OWNED,
		signals.SILVER_CARDS_OWNED,
		signals.GOLD_CARDS_OWNED,
		signals.MAX_DECK_OWNERSHIP_PERC,
		signals.AVG_DECK_BAN_SCORE,
	)
	if err != nil {
		log.Error().Msgf("failed cleaning up ownership signals: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.CARDS_UNLOCKED_PLAYED_CONSTRUCTED,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Count{
				Count: int64(constructedUnlockedCardsDummy),
			},
			MLScore: float64(constructedUnlockedCardsDummy),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal %s with: %v", signals.CARDS_UNLOCKED_PLAYED_CONSTRUCTED, err)
		return err
	}

	deckMap := make(map[string]*deckStats)
	var decks []*data.Deck
	err = data.DB.Decks().Find(db.Cond{"account_id": accountID}).All(&decks)
	if err != nil {
		log.Error().Msgf("failed fetching decks with: %v", err)
		return err
	}

	if len(decks) == 0 {
		return nil
	}

	for _, d := range decks {
		stats := &deckStats{
			Deck: d,
		}

		if len(d.CardIDs) > 0 {
			deckCards := u64set.New(d.CardIDs...)
			deckCardsOwned := u64set.Intersection(deckCards, cardsOwned)
			stats.CardsOwnedPerc = float64(deckCardsOwned.Size()) / float64(deckCards.Size())
		}

		deckMap[d.DeckString] = stats
	}

	rows, err = data.DB.Session.SQL().Query(`
		SELECT
			deck_string,
			account_actions.is_active IS TRUE AS is_banned,
			COUNT(1) AS owner_count
		FROM
			decks
		LEFT JOIN
			account_actions
		ON decks.account_id = account_actions.account_id
		WHERE
			deck_string IN (SELECT deck_string FROM decks WHERE account_id = ?)
		GROUP BY 1, 2`, accountID)

	if err != nil {
		log.Error().Msgf("failed fetching deck ban score data with: %v", err)
		return err
	}

	var deckString string
	var isBanned bool
	var ownerCount int64

	for rows.Next() {
		err = rows.Scan(&deckString, &isBanned, &ownerCount)
		if err != nil {
			log.Error().Msgf("failed card ownership with: %v", err)
			return err
		}

		deck := deckMap[deckString]

		if isBanned {
			deck.BannedOwners += ownerCount
		} else {
			deck.NotBannedOwners += ownerCount
		}
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.CARDS_UNLOCKED,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Count{
				Count: int64(cardsOwned.Size()),
			},
			MLScore: float64(cardsOwned.Size()),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal %s with: %v", signals.CARDS_UNLOCKED, err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.BASE_CARDS_OWNED,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Count{
				Count: int64(baseCards),
			},
			MLScore: float64(baseCards),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal %s with: %v", signals.BASE_CARDS_OWNED, err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.GOLD_CARDS_OWNED,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Count{
				Count: int64(goldCards),
			},
			MLScore: float64(goldCards),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal %s with: %v", signals.GOLD_CARDS_OWNED, err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.SILVER_CARDS_OWNED,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Count{
				Count: int64(silverCards),
			},
			MLScore: float64(silverCards),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal %s with: %v", signals.SILVER_CARDS_OWNED, err)
		return err
	}

	var maxOwnership float64
	var banScore float64
	for _, ds := range deckMap {
		if ds.CardsOwnedPerc > maxOwnership {
			maxOwnership = ds.CardsOwnedPerc
		}

		if (ds.BannedOwners + ds.NotBannedOwners) > 5 {
			banScore += float64(ds.BannedOwners) / float64(ds.BannedOwners+ds.NotBannedOwners)
		}
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MAX_DECK_OWNERSHIP_PERC,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: maxOwnership,
			},
			MLScore: maxOwnership,
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal %s with: %v", signals.MAX_DECK_OWNERSHIP_PERC, err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.AVG_DECK_BAN_SCORE,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: banScore / float64(len(deckMap)),
			},
			MLScore: banScore / float64(len(deckMap)),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal %s with: %v", signals.AVG_DECK_BAN_SCORE, err)
		return err
	}

	err = data.DB.Tasks(sess).EnqueueTask(AccountScoreQueue, AccountScoreTask{
		AccountID: accountID,
		Nonce:     task.ID,
	}, nil, &accountID)
	if err != nil {
		log.Error().Msgf("failed updating account score with: %v", err)
		return err
	}

	return nil
}
