package data

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/lib/signals"
	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	signalScores           = map[string]float32{}
	signalScoresMutex      = sync.RWMutex{}
	signalScoresLastUpdate *time.Time
)

func updateSignalScores() error {
	signalScoresMutex.Lock()
	defer signalScoresMutex.Unlock()

	if signalScoresLastUpdate == nil || signalScoresLastUpdate.Before(time.Now().Add(-5*time.Minute)) {
		var scores []struct {
			SignalType string  `db:"signal_type"`
			Score      float32 `db:"score"`
		}
		err := DB.SQL().Select("signal_type", "score").From("signal_scores").All(&scores)
		if err != nil {
			return err
		}

		signalScores = make(map[string]float32)
		for _, s := range scores {
			signalScores[s.SignalType] = s.Score
		}

		signalScoresLastUpdate = TimeNowUTCPtr()
	}
	return nil
}

type AccountSignal struct {
	*proto.AccountSignal
}

// BeforeCreate satisfies db.BeforeCreateHook.
func (a *AccountSignal) BeforeCreate(sess db.Session) error {
	if err := a.beforeSave(sess); err != nil {
		return err
	}
	return nil
}

// BeforeUpdate satisfies db.BeforeUpdateHook.
func (a *AccountSignal) BeforeUpdate(sess db.Session) error {
	if err := a.beforeSave(sess); err != nil {
		return err
	}
	return nil
}

func (a *AccountSignal) beforeSave(sess db.Session) error {
	var err error
	a.Payload, err = json.Marshal(a.SignalData)
	if err != nil {
		return err
	}
	return nil
}

func (a *AccountSignal) Present() error {
	err := updateSignalScores()
	if err != nil {
		return err
	}

	switch a.SignalType {
	case signals.USER_REPORT:
		var signalData *signals.UserReport
		err = json.Unmarshal(a.Payload, &signalData)
		a.SignalData = signalData

	case signals.SIMILAR_USERNAMES:
		var signalData *signals.SimilarUsernames
		err = json.Unmarshal(a.Payload, &signalData)
		a.SignalData = signalData

	case signals.SAME_IP, signals.SAME_IP_SAME_CREATION_DAY,
		signals.MATCHES_PLAYED, signals.MATCHES_PLAYED_CONQUEST, signals.MATCHES_PLAYED_CONSTRUCTED,
		signals.USER_REPORT_COUNT, signals.CARDS_UNLOCKED_PLAYED_CONSTRUCTED,
		signals.CARDS_UNLOCKED,
		signals.BASE_CARDS_OWNED,
		signals.SILVER_CARDS_OWNED,
		signals.GOLD_CARDS_OWNED:
		var signalData *signals.Count
		err = json.Unmarshal(a.Payload, &signalData)
		a.SignalData = signalData

	case signals.MATCHES_NONCE_AVG, signals.MATCHES_DURATION_AVG, signals.AVG_DECK_BAN_SCORE,
		signals.AVG_MATCH_MOVES, signals.STDDEV_MATCH_MOVES:
		var signalData *signals.Average
		err = json.Unmarshal(a.Payload, &signalData)
		a.SignalData = signalData

	case signals.MATCHES_PLAYED_VS_BANNED_PERC,
		signals.MATCHES_PLAYED_VS_FEEDER_PERC,
		signals.MATCHES_PLAYED_CONQUEST_PERC,
		signals.MATCHES_WON_PERC,
		signals.MATCHES_WON_BY_FORFEIT_PERC,
		signals.MATCHES_PLAYED_FORFEITED_PERC,
		signals.MAX_DECK_OWNERSHIP_PERC,
		signals.USER_REPORTS_PER_GAME,
		signals.PLAYER_IS_FEEDER:
		var signalData *signals.Fraction
		err = json.Unmarshal(a.Payload, &signalData)
		a.SignalData = signalData

	case signals.DIGITS_IN_USERNAME:
		var signalData signals.DigitsInUsername
		err = json.Unmarshal(a.Payload, &signalData)
		a.SignalData = signalData

	default:
		a.SignalData = make(map[string]interface{})
	}

	if err == nil {
		signalScoresMutex.RLock()
		a.Score = signalScores[a.SignalType]
		signalScoresMutex.RUnlock()
	}

	return err
}

func (a *AccountSignal) Store(sess db.Session) db.Store {
	return DB.AccountSignals(sess)
}

type AccountSignalsStore struct {
	db.Collection
}

func (s *AccountSignalsStore) FindAll() ([]*AccountSignal, error) {
	var accountSignals []*AccountSignal
	err := s.Find(db.Cond{}).All(&accountSignals)
	if err != nil {
		return nil, err
	}
	return accountSignals, nil
}

func (s *AccountSignalsStore) FindOne(conds ...interface{}) (*AccountSignal, error) {
	var accountSignal AccountSignal
	err := s.Find(conds...).One(&accountSignal)
	if err != nil {
		return nil, err
	}
	return &accountSignal, nil
}

func (s *AccountSignalsStore) FindByAccountID(accountID proto.AccountID) (*AccountSignal, error) {
	return s.FindOne(db.Cond{"account_id": accountID})
}
