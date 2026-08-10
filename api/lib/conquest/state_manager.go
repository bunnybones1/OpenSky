package conquest

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"github.com/scylladb/go-set/u64set"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

type StateManager struct {
	cfg              config.OpenSkyConquestV2Config
	metricsCollector MetricsCollector
}

func NewStateManager(cfg config.OpenSkyConquestV2Config, metricsCollector MetricsCollector) *StateManager {
	return &StateManager{
		cfg:              cfg,
		metricsCollector: metricsCollector,
	}
}

func (m *StateManager) Enter(ctx context.Context, accountID proto.AccountID, hero proto.Hero) (bool, error) {
	if hero == proto.Hero_UNKNOWN {
		return false, fmt.Errorf("hero is missing")
	}

	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		conquest, err := data.DB.Conquests(sess).FindInProgress(accountID)
		if err != nil {
			return fmt.Errorf("find conquest in progress: %w", err)
		}

		if conquest != nil {
			return nil
		}

		rankRequirements, err := data.DB.AccountStats(sess).Find(db.Cond{
			"account_id":  accountID,
			"player_rank": db.Gte(proto.PlayerRank_TRAINEE),
		}).Exists()
		if err != nil {
			return fmt.Errorf("find account stats: %w", err)
		}

		if !rankRequirements {
			return fmt.Errorf("the rank is too low")
		}

		conquestTickets, err := data.DB.Items(sess).GetConquestTickets(accountID)
		if err != nil {
			return fmt.Errorf("get conquest tickets: %w", err)
		}

		if conquestTickets == 0 {
			return fmt.Errorf("not enough conquest tickets")
		}

		lastNonce, err := data.DB.Conquests(sess).FindLastNonce(accountID)
		if err != nil {
			return fmt.Errorf("find last nonce: %w", err)
		}

		conquest = &data.Conquest{Conquest: &proto.Conquest{
			Status:    proto.ConquestStatus_IN_PROGRESS,
			AccountID: accountID,
			Nonce:     lastNonce + 1,
			Mode:      proto.GameMode_CONQUEST_CONSTRUCTED,
			Hero:      hero,
		}}

		if err := sess.Save(conquest); err != nil {
			return fmt.Errorf("save conquest: %w", err)
		}

		if err := data.DB.Items(sess).SpendConquestTicket(accountID, proto.TransactionType_SKYWEAVER, ""); err != nil {
			return fmt.Errorf("spend conquest ticket")
		}

		m.metricsCollector.TrackConquestEntered(hero)

		return nil
	}, nil)
	if err != nil {
		return false, err
	}

	return true, nil
}

func (m *StateManager) UpdateProgress(_ context.Context, sess db.Session, accountID proto.AccountID, matchID uint64, matchResult proto.ConquestMatchResult) ([]*proto.FeedEvent, []*proto.Reward, error) {
	var events []*proto.FeedEvent

	var rewards []*proto.Reward

	conquest, err := data.DB.Conquests(sess).FindInProgress(accountID)
	if err != nil {
		return nil, nil, fmt.Errorf("find conquest in progress: %w", err)
	}

	if conquest == nil {
		return nil, nil, fmt.Errorf("there is no conquest in progress")
	}

	if conquest.MatchProgress == nil {
		conquest.MatchProgress = map[uint64]proto.ConquestMatchResult{}
	}

	conquest.MatchProgress[matchID] = matchResult

	if !conquest.CanHaveMoreMatches() {
		events, rewards, err = m.exit(sess, conquest)
		if err != nil {
			return nil, nil, fmt.Errorf("exit conquest: %w", err)
		}
	}

	if err := sess.Save(conquest); err != nil {
		return nil, nil, fmt.Errorf("save conquest: %w", err)
	}

	return events, rewards, nil
}

func (m *StateManager) exit(sess db.Session, conquest *data.Conquest) ([]*proto.FeedEvent, []*proto.Reward, error) {
	var rewards []*proto.Reward

	var events []*proto.FeedEvent

	var wins int

	for _, result := range conquest.MatchProgress {
		if result == proto.ConquestMatchResult_WIN {
			wins++
		}
	}

	silverCardIDs := make([]uint64, 0, 2)
	goldCardIDs := make([]uint64, 0, 1)

	switch wins {
	case 1:
		reward := m.getSilverCard(conquest)
		rewards = append(rewards, reward)
		silverCardIDs = append(silverCardIDs, data.ItemTypeAndID2SWTokenID(
			proto.ItemType_SW_SILVER_CARDS,
			reward.Card.Card.ID,
		))
	case 2:
		for i := 1; i <= 2; i++ {
			reward := m.getSilverCard(conquest)
			rewards = append(rewards, reward)
			silverCardIDs = append(silverCardIDs, data.ItemTypeAndID2SWTokenID(
				proto.ItemType_SW_SILVER_CARDS,
				reward.Card.Card.ID,
			))
		}

		// Sorting silvers since unsorted ids will make the tx revert
		sort.Slice(silverCardIDs, func(i, j int) bool { return silverCardIDs[i] < silverCardIDs[j] })
	case 3:
		reward := m.getSilverCard(conquest)
		rewards = append(rewards, reward)
		silverCardIDs = append(silverCardIDs, data.ItemTypeAndID2SWTokenID(
			proto.ItemType_SW_SILVER_CARDS,
			reward.Card.Card.ID,
		))

		reward, err := m.getGoldCard(sess, conquest)
		if err != nil {
			return nil, nil, fmt.Errorf("get gold card: %w", err)
		}

		rewards = append(rewards, reward)
		goldCardIDs = append(goldCardIDs, data.ItemTypeAndID2SWTokenID(
			proto.ItemType_SW_GOLD_CARDS,
			reward.Card.Card.ID,
		))
	default:
		if err := m.complete(conquest); err != nil {
			return nil, nil, fmt.Errorf("complete: %w", err)
		}

		m.metricsCollector.TrackConquestExited(wins)

		return nil, nil, nil
	}

	if len(silverCardIDs) > 0 {
		events = append(events, &proto.FeedEvent{
			AccountID: conquest.AccountID,
			TokenIDs:  silverCardIDs,
			Type:      proto.FeedEventType_REWARD,
		})
	}

	if len(goldCardIDs) > 0 {
		events = append(events, &proto.FeedEvent{
			AccountID: conquest.AccountID,
			TokenIDs:  goldCardIDs,
			Type:      proto.FeedEventType_DELAYED_REWARD,
		})
	}

	err := data.DB.Tasks(sess).EnqueueTask(jobqueue.ExitConquestQueue, jobqueue.ExitConquestTask{
		ConquestID:    conquest.ID,
		Nonce:         conquest.Nonce,
		AccountID:     conquest.AccountID,
		SilverCardIDs: silverCardIDs,
		GoldCardIDs:   goldCardIDs,
	}, nil, &conquest.AccountID)
	if err != nil {
		return nil, nil, fmt.Errorf("enqueue ExitConquestQueue: %w", err)
	}

	conquest.Status = proto.ConquestStatus_REWARDS_PENDING

	m.metricsCollector.TrackConquestExited(wins)

	return events, rewards, nil
}

func (m *StateManager) getSilverCard(conquest *data.Conquest) *proto.Reward {
	var excludedCardIDs []uint64

	excludedCardIDs = data.CardIndex.CardIDsByCardSets(m.cfg.RewardsExcludedCardSets...)
	excludedCardIDs = append(excludedCardIDs, data.CardIndex.CardIDsSeasonInvalid(data.CurrentSeason())...)

	card := data.CardIndex.GetRandomCard(excludedCardIDs)

	return &proto.Reward{
		AccountID: conquest.AccountID,
		Type:      proto.RewardType_CARD,
		Card: &proto.RewardCard{
			Item: &proto.Item{
				ItemType: proto.ItemType_SW_SILVER_CARDS,
				TokenID:  card.Card.ID,
			},
			Card: card.Card,
		},
	}
}

func (m *StateManager) getGoldCard(sess db.Session, conquest *data.Conquest) (*proto.Reward, error) {
	weeklyGolds, err := data.DB.WeeklyGolds(sess).CurrentRewardTokenIDs()
	if err != nil {
		return nil, fmt.Errorf("get weekly golds: %w", err)
	}

	weeklyGoldsBaseIDs := u64set.New()

	for _, r := range weeklyGolds {
		_, id, err := data.SWTokenID2TypeAndItemID(r)
		if err != nil {
			continue
		}

		weeklyGoldsBaseIDs.Add(id)
	}

	card := data.CardIndex.GetRandomCardFromList(weeklyGoldsBaseIDs, nil)

	return &proto.Reward{
		AccountID: conquest.AccountID,
		Type:      proto.RewardType_CARD,
		Card: &proto.RewardCard{
			Item: &proto.Item{
				ItemType: proto.ItemType_SW_GOLD_CARDS,
				TokenID:  card.Card.ID,
			},
			Card: card.Card,
		},
	}, nil
}

func (m *StateManager) complete(conquest *data.Conquest) error {
	if conquest.CanHaveMoreMatches() {
		return fmt.Errorf("conquest %d cannot be completed, can have more matches", conquest.ID)
	}

	conquest.Status = proto.ConquestStatus_COMPLETED

	m.metricsCollector.TrackConquestCompleted()

	return nil
}

func (m *StateManager) Complete(_ context.Context, sess db.Session, accountID proto.AccountID, conquestID uint64) error {
	conquest, err := data.DB.Conquests(sess).FindOne(db.Cond{
		"id":         conquestID,
		"account_id": accountID,
	})
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return fmt.Errorf("find conquest, id: %d, account ID: %d, %w", conquestID, accountID, err)
	}

	if conquest == nil || errors.Is(err, db.ErrNoMoreRows) {
		return fmt.Errorf("conquest, id: %d, account ID: %d, does not exist", conquestID, accountID)
	}

	if err := m.complete(conquest); err != nil {
		return fmt.Errorf("complete: %w", err)
	}

	if err := sess.Save(conquest); err != nil {
		return fmt.Errorf("save conquest: %w", err)
	}

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/metrics_collector.go -package mock . MetricsCollector
type MetricsCollector interface {
	TrackConquestEntered(proto.Hero)
	TrackConquestExited(wins int)
	TrackConquestCompleted()
}
