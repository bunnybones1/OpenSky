package rpc

import (
	"context"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/quests"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) ListQuests(ctx context.Context, accountAddress *string) ([]*proto.Quest, []*proto.Reward, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, accountAddress)
	if err != nil {
		return nil, nil, err
	}

	quests, err := s.QuestLister.List(ctx, repo, accountID)
	if err != nil {
		logger.Err(err).Msg("list quests")
		return nil, nil, proto.ErrorInternal("list quests")
	}

	return quests, nil, nil
}

func (s *Server) ClaimQuestRewards(ctx context.Context, ids []uint64, accountAddress *string) (*proto.Quest, []*proto.Reward, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, accountAddress)
	if err != nil {
		return nil, nil, err
	}

	rewards, quests, err := s.QuestClaimer.ManualClaim(ctx, repo, accountID, ids)
	if err != nil {
		logger.Err(err).Msg("claim quest rewards")
		return nil, nil, proto.ErrorInternal("claim quest rewards")
	}

	var quest *proto.Quest
	if len(quests) > 0 {
		quest = quests[0]
	}

	return quest, rewards, nil
}

func (s *Server) ReRollQuest(ctx context.Context, id uint64) (*proto.Quest, []*proto.Reward, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, nil)
	if err != nil {
		return nil, nil, err
	}

	rewards, quest, err := s.QuestReRoller.ManualReRoll(ctx, repo, accountID, id)
	if err != nil {
		logger.Err(err).Msg("re-roll quest")
		return nil, nil, proto.ErrorInternal("re-roll quest")
	}

	return quest, rewards, nil
}

func (s *Server) SetQuestsAsSeen(ctx context.Context, ids []uint64) (bool, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, nil)
	if err != nil {
		return false, err
	}

	err = data.DB.QuestsAssignments(repo).SetAsSeen(accountID, ids)
	if err != nil {
		logger.Err(err).Msg("set as seen")
		return false, proto.ErrorInternal("set as seen")
	}

	return true, nil
}

func (s *Server) GetQuestsAutoRerollTime(_ context.Context) (*proto.QuestsAutoRerollTimeResponse, error) {
	now := data.TimeNowUTC()
	seasonStart := data.SeasonStartTime(1)

	nextDailyAutoReroll := time.Date(
		now.Year(),
		now.Month(),
		now.Day(),
		seasonStart.Hour(),
		seasonStart.Minute(),
		0,
		0,
		time.UTC,
	)

	if nextDailyAutoReroll.Before(now) {
		nextDailyAutoReroll = nextDailyAutoReroll.Add(24 * time.Hour)
	}

	season, week := data.SeasonWeekFromTimestamp(now)
	nextWeeklyAutoReroll := data.SeasonWeekStartTime(season, week).Add(7 * 24 * time.Hour)

	nextSeasonalAutoReroll := data.SeasonStartTime(data.CurrentSeason() + 1)

	return &proto.QuestsAutoRerollTimeResponse{
		Daily:    nextDailyAutoReroll,
		Weekly:   nextWeeklyAutoReroll,
		Seasonal: nextSeasonalAutoReroll,
	}, nil
}

func (s *Server) GetEpicQuestChain(ctx context.Context, epicType *proto.EpicType) ([]*proto.Quest, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if epicType == nil {
		return nil, proto.ErrorInternal("epic type cannot be nil")
	}

	accountID, err := s.validateAccountAndGetAddress(ctx, nil)
	if err != nil {
		return nil, err
	}

	quests, err := s.QuestLister.ListEpicChain(repo, accountID, *epicType)
	if err != nil {
		logger.Err(err).Msg("list epic chain")
		return nil, proto.ErrorInternal("list epic chain")
	}

	return quests, nil
}

func (s *Server) GMCompleteQuest(ctx context.Context, accountAddress *string, id uint64) (bool, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, accountAddress)
	if err != nil {
		return false, err
	}

	questAssignment, err := data.DB.QuestsAssignments(repo).FindOne(db.Cond{
		"account_id": accountID,
		"id":         id,
	})
	if err != nil {
		logger.Err(err).Msg("find quest assignment")
		return false, proto.ErrorInternal("find quest assignment")
	}

	questAssignment.Status = data.QuestStatusCompleted

	if err := repo.Save(questAssignment); err != nil {
		logger.Err(err).Msg("save quest assignment")
		return false, proto.ErrorInternal("save quest assignment")
	}

	return true, nil
}

func (s *Server) GMDeleteQuest(ctx context.Context, accountAddress *string, id uint64) (bool, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, accountAddress)
	if err != nil {
		return false, err
	}

	if s.Config.Mode == config.ProductionMode {
		logger.Error().Msgf("forbidden delete of quest ID %d for account %d", id, accountID)
		return false, proto.ErrorInternal("cannot delete quest in production")
	}

	err = data.DB.QuestsAssignments(repo).Find(db.Cond{"account_id": accountID, "id": id}).Delete()
	if err != nil {
		logger.Err(err).Msgf("delete quest ID %d for account %d", id, accountID)
		return false, proto.ErrorInternal("delete quest")
	}

	return true, nil
}

func (s *Server) GMResetQuestReRolls(ctx context.Context, accountAddress *string, periodicity *proto.QuestPeriodicity) (bool, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, accountAddress)
	if err != nil {
		return false, err
	}

	if periodicity == nil || *periodicity == proto.QuestPeriodicity_UNKNOWN {
		return false, proto.ErrorInternal("correct periodicity is missing")
	}

	period := quests.GetCurrentPeriod(*periodicity)

	if err := data.DB.QuestsAssignments(repo).ResetReRolls(accountID, *periodicity, period); err != nil {
		logger.Err(err).Msg("reset re-rolls")
		return false, proto.ErrorInternal("reset re-rolls")
	}

	return true, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/quests_lister.go -package mock . QuestsLister
type QuestsLister interface {
	List(context.Context, db.Session, proto.AccountID) ([]*proto.Quest, error)
	ListEpicChain(db.Session, proto.AccountID, proto.EpicType) ([]*proto.Quest, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/quests_claimer.go -package mock . QuestsClaimer
type QuestsClaimer interface {
	ManualClaim(ctx context.Context, sess db.Session, accountID proto.AccountID, ids []uint64) ([]*proto.Reward, []*proto.Quest, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/quests_reroller.go -package mock . QuestsReRoller
type QuestsReRoller interface {
	ManualReRoll(ctx context.Context, sess db.Session, accountID proto.AccountID, id uint64) ([]*proto.Reward, *proto.Quest, error)
}
