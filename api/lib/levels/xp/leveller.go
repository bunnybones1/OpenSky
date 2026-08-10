package xp

import (
	"fmt"
	"math/big"

	"github.com/rs/zerolog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/lib/levels"
	"github.com/horizon-games/OpenSky/api/proto"
)

type leveller struct {
	logger           zerolog.Logger
	analyticsTracker analytics.Tracker
	promoter         Promoter
}

func NewLeveller(logger zerolog.Logger, analyticsTracker analytics.Tracker, promoter Promoter) *leveller {
	return &leveller{
		logger:           logger,
		analyticsTracker: analyticsTracker,
		promoter:         promoter,
	}
}

func (l *leveller) SetAnalyticsTracker(analyticsTracker analytics.Tracker) {
	l.analyticsTracker = analyticsTracker
}

func (l *leveller) LevelUp(sess db.Session, account *data.Account) ([]*proto.FeedEvent, []*proto.Reward, error) {
	var events []*proto.FeedEvent

	var rewards []*proto.Reward

	if account == nil {
		return nil, nil, fmt.Errorf("account cannot be nil")
	}

	currentXP, err := data.DB.Items(sess).GetXP(account.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("get xp: %w", err)
	}

	initialLevel := account.Level

	var newXP uint64

	account.Level, newXP = levels.LevelUp(account.Level, currentXP)

	if currentXP != newXP {
		for i := initialLevel; i < account.Level; i++ {
			l := i + 1

			events = append(events, &proto.FeedEvent{
				AccountID: account.ID,
				Type:      proto.FeedEventType_LEVELUP,
				Level:     &l,
			})
		}

		diffLevel := account.Level - initialLevel

		err := data.DB.Items(sess).SpendXP(
			account.ID,
			big.NewInt(int64(currentXP-newXP)),
			proto.TransactionType_LEVEL_UP,
			"",
		)
		if err != nil {
			return nil, nil, fmt.Errorf("spend xp: %w", err)
		}

		if err := data.DB.SkypassSeasonStats(sess).UpdateProgress(account.ID, data.CurrentSeason(), account.Level); err != nil {
			return nil, nil, fmt.Errorf("update skypass season progress: %w", err)
		}

		if err := data.DB.LevelsPerSeason(sess).SetLevels(account, uint64(diffLevel), data.CurrentSeason()); err != nil {
			return nil, nil, fmt.Errorf("update levels per season: %w", err)
		}

		if account.InvitedByID != nil {
			err = data.DB.Items(sess).GainStickerPoints(*account.InvitedByID, big.NewInt(int64(diffLevel)), proto.TransactionType_SKYWEAVER, "")
			if err != nil {
				return nil, nil, fmt.Errorf("gain sticker points: %w", err)
			}
		}

		promotionEvents, promotionRewards, err := l.promoter.PromoteUnranked(sess, account, newXP)
		if err != nil {
			return nil, nil, fmt.Errorf("promote unranked: %w", err)
		}

		if err := data.DB.Accounts(sess).UpdateLevel(account.ID, account.Level); err != nil {
			return nil, nil, fmt.Errorf("update account level: %w", err)
		}

		gamesPlayed, err := data.DB.AccountStats(sess).GetGamesPlayed(account.ID, data.CurrentSeason())
		if err != nil {
			return nil, nil, fmt.Errorf("get games played: %w", err)
		}

		if err := l.analyticsTracker.TrackLevelUps(nil, account.ID, initialLevel, account.Level, gamesPlayed); err != nil {
			l.logger.Err(err).Msg("TrackLevelUps")
		}

		events = append(events, promotionEvents...)
		rewards = append(rewards, promotionRewards...)
	}

	return events, rewards, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/promoter.go -package mock . Promoter
type Promoter interface {
	PromoteUnranked(sess db.Session, account *data.Account, xp uint64) ([]*proto.FeedEvent, []*proto.Reward, error)
}
