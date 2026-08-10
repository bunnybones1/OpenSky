package rpc

import (
	"context"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) GetGameModesStatus(ctx context.Context) (*proto.GameModesStatus, error) {
	repo := rctx.DBContext(ctx)
	logger := rctx.Logger(ctx)

	status := &proto.GameModesStatus{
		Tutorial:             true,
		PracticePVP:          true,
		PracticeBot:          true,
		WarmUp:               true,
		RankedConstructed:    true,
		RankedDiscovery:      true,
		ConquestConstructed:  true,
		ConquestDiscovery:    true,
		ChallengeConstructed: true,
		ChallengeDiscovery:   true,
	}

	var statuses []*data.GameModeStatus

	err := repo.GameModeStatus(nil).Find().All(&statuses)
	if err != nil {
		if err != db.ErrNoMoreRows {
			return nil, proto.ErrorInternal("find game status failed: %v", err)
		}
	}

	for _, st := range statuses {
		switch *st.GameMode {
		case proto.GameMode_TUTORIAL:
			status.Tutorial = st.Enabled
		case proto.GameMode_PRACTICE_BOT:
			status.PracticeBot = st.Enabled
		case proto.GameMode_PRACTICE_PVP:
			status.PracticePVP = st.Enabled
		case proto.GameMode_WARM_UP:
			status.WarmUp = st.Enabled
		case proto.GameMode_RANKED_CONSTRUCTED:
			status.RankedConstructed = st.Enabled
		case proto.GameMode_RANKED_DISCOVERY:
			status.RankedDiscovery = st.Enabled
		case proto.GameMode_CONQUEST_CONSTRUCTED:
			status.ConquestConstructed = st.Enabled
		case proto.GameMode_CONQUEST_DISCOVERY:
			status.ConquestDiscovery = st.Enabled
		case proto.GameMode_CHALLENGE_CONSTRUCTED:
			status.ChallengeConstructed = st.Enabled
		case proto.GameMode_CHALLENGE_DISCOVERY:
			status.ChallengeDiscovery = st.Enabled
		default:
			logger.Warn().Msgf("unhandled game mode %v", *st.GameMode)
			continue
		}
	}

	return status, nil
}

func (s *Server) GMGameModeSet(ctx context.Context, gameMode *proto.GameMode, enable bool) (bool, error) {
	repo := rctx.DBContext(ctx)

	if gameMode == nil || *gameMode == proto.GameMode_UNKNOWN {
		return false, proto.ErrorInvalidArgument("gameMode", "invalid game mode")
	}

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("account", "is not logged in")
	}

	err := repo.Tx(func(sess db.Session) error {
		status := data.GameModeStatus{
			GameModeStatus: &proto.GameModeStatus{
				GameMode: gameMode,
				Enabled:  enable,
			},
		}

		err := sess.Save(&status)
		if err != nil {
			return fmt.Errorf("save game mode status: %w", err)
		}

		statusHistory := data.GameModeStatusHistory{
			GameModeStatusHistory: &proto.GameModeStatusHistory{
				AccountID: account.ID,
				GameMode:  gameMode,
				Enabled:   enable,
			},
		}

		err = sess.Save(&statusHistory)
		if err != nil {
			return fmt.Errorf("save game mode status history: %w", err)
		}

		return nil
	})
	if err != nil {
		return false, proto.ErrorInternal("save game mode status: %v", err)
	}

	return true, nil
}

func (s *Server) GMGameModeStatusHistory(ctx context.Context, page *proto.Page, gameModes []*proto.GameMode) (*proto.Page, []*proto.GameModeStatusHistory, error) {
	repo := rctx.DBContext(ctx)

	if page == nil {
		pageSize := uint32(200)

		page = &proto.Page{
			PageSize: &pageSize,
		}
	}

	orderByCreatedAt := &proto.SortBy{
		Column: "created_at",
		Order:  &sortOrder_ASC,
	}

	paginator, err := NewPaginator(page, orderByCreatedAt)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	var result db.Result

	if len(gameModes) > 0 {
		result = repo.GameModeStatusHistory(nil).Find(db.Cond{
			"game_mode": db.AnyOf(gameModes),
		})
	} else {
		result = repo.GameModeStatusHistory(nil).Find()
	}

	var history []*proto.GameModeStatusHistory
	if err = paginator.Source(result).Get(ctx, &history); err != nil && err != db.ErrNoMoreRows {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "get game mode status history")
	}

	return paginator.Page(), history, nil
}
