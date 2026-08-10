package conquestv2

import (
	"context"
	"fmt"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

const EventID = 2

// PointsUpdater updates conquest points for players.
type PointsUpdater struct {
	treasureCalculator TreasureCalculator
	pointsCalculator   PointsCalculator
	analyticsTracker   analytics.Tracker
}

// NewPointsUpdater instantiates a new PointsUpdater.
func NewPointsUpdater(treasureCalculator TreasureCalculator, pointsCalculator PointsCalculator, analyticsTracker analytics.Tracker) *PointsUpdater {
	return &PointsUpdater{
		treasureCalculator: treasureCalculator,
		pointsCalculator:   pointsCalculator,
		analyticsTracker:   analyticsTracker,
	}
}

// Update updates conquest points based on data.Match.
// If there is a draw or the match took within 3 turns, no points are earned.
// Players earn 4 points for a completed match plus points based on cards.
func (p *PointsUpdater) Update(ctx context.Context, sess db.Session, match *data.Match) ([]*proto.FeedEvent, []*proto.Reward, error) {
	if !match.IsConquest() {
		return nil, nil, nil
	}

	if !match.HasWinner() {
		return nil, nil, nil
	}

	var rewards []*proto.Reward

	if p.isEligibleForRewards(match, 1) {
		rewardPlayer1, err := p.rewardPlayer(ctx, sess, match.Player1ID, match.Player1DeckString)
		if err != nil {
			return nil, nil, fmt.Errorf("reward player 1: %w", err)
		}

		rewards = append(rewards, rewardPlayer1)
	}

	if p.isEligibleForRewards(match, 2) {
		rewardPlayer2, err := p.rewardPlayer(ctx, sess, match.Player2ID, match.Player2DeckString)
		if err != nil {
			return nil, nil, fmt.Errorf("reward player 2: %w", err)
		}

		rewards = append(rewards, rewardPlayer2)
	}

	return nil, rewards, nil
}

func (p *PointsUpdater) isEligibleForRewards(match *data.Match, playerNumber uint) bool {
	return match.Status == proto.MatchStatus_COMPLETED ||
		((match.Status == proto.MatchStatus_FORFEITED || match.Status == proto.MatchStatus_ABANDONED) &&
			*match.WinningPlayer == playerNumber || match.TurnNonce >= 8)
}

func (p *PointsUpdater) rewardPlayer(ctx context.Context, sess db.Session, accountID proto.AccountID, deckString string) (*proto.Reward, error) {
	repo := rctx.DBContext(ctx)

	earnedPoints, err := p.pointsCalculator.FromDeckString(ctx, accountID, deckString)
	if err != nil {
		return nil, fmt.Errorf("calculate earned points: %w", err)
	}

	reward := &proto.Reward{
		AccountID:                  accountID,
		Type:                       proto.RewardType_CONQUEST_POINTS,
		ConquestV2TreasureProgress: &proto.RewardConquestV2TreasureProgress{},
	}

	conquestPointsBefore, err := repo.ConquestPoints(sess).FindOrCreateByAddressAndEventID(accountID, EventID)
	if err != nil {
		return nil, fmt.Errorf("find or create conquest points: %w", err)
	}

	treasureProgress, err := p.treasureCalculator.FromConquestPoints(conquestPointsBefore)
	if err != nil {
		return nil, fmt.Errorf("get conqust points data before match: %w", err)
	}

	reward.ConquestV2TreasureProgress.BeforeMatch = treasureProgress.ConquestV2TreasureProgress

	if earnedPoints+conquestPointsBefore.CurrentPoints >= conquestPointsCap {
		earnedPoints = conquestPointsCap - conquestPointsBefore.CurrentPoints
	}

	_, err = sess.SQL().
		Update("conquest_points").
		Where(db.Cond{
			"account_id": accountID,
			"event_id":   EventID,
		}).
		Set(
			db.Raw("current_points = current_points + ?", earnedPoints),
			db.Raw("total_points = total_points + ?", earnedPoints),
		).
		Exec()
	if err != nil {
		return nil, fmt.Errorf("save conquest points: %w", err)
	}

	conquestPointsAfter, err := repo.ConquestPoints(sess).FindOrCreateByAddressAndEventID(accountID, EventID)
	if err != nil {
		return nil, fmt.Errorf("find or create conquest points: %w", err)
	}

	treasureProgress, err = p.treasureCalculator.FromConquestPoints(conquestPointsAfter)
	if err != nil {
		return nil, fmt.Errorf("get conqust points data after match: %w", err)
	}

	reward.ConquestV2TreasureProgress.AfterMatch = treasureProgress.ConquestV2TreasureProgress

	if earnedPoints > 0 {
		detailedPoints, err := p.pointsCalculator.DetailedFromDeckString(ctx, accountID, deckString)
		if err != nil {
			log.Err(err).Msg("get detailed points from deckstring")
		} else {
			if err := p.analyticsTracker.TrackConquestPointsAwarded(nil, accountID, treasureProgress, detailedPoints.MatchPoints, detailedPoints.SilverCardPoints, detailedPoints.GoldCardPoints, detailedPoints.HeroSkinPoints); err != nil {
				log.Err(err).Msg("TrackConquestPointsAwarded")
			}
		}
	}

	return reward, nil
}

// PointsCalculator calculates points for a conquest match.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/points_calculator.go -package mock . PointsCalculator
type PointsCalculator interface {
	FromDeckString(context.Context, proto.AccountID, string) (uint64, error)
	DetailedFromDeckString(context.Context, proto.AccountID, string) (*DetailedPoints, error)
}

// TreasureCalculator calculates a progress for conquest treasures.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/treasure_calculator.go -package mock . TreasureCalculator
type TreasureCalculator interface {
	FromConquestPoints(*data.ConquestPoints) (*data.ConquestV2TreasureProgress, error)
}
