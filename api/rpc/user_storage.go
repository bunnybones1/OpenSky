package rpc

import (
	"context"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
	db "github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/postgresql"
)

func (s *Server) UserStorageFetch(ctx context.Context, key string) (interface{}, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	repo := rctx.DBContext(ctx)

	userStorage, err := repo.UsersStorage().FindKey(account.ID, key)
	if err != nil {
		if err == db.ErrNoMoreRows {
			return nil, nil
		}

		return nil, proto.ErrorInternal("failed to fetch user storage data %v", err)
	}

	return userStorage.Object, nil
}

func (s *Server) UserStorageFetchAll(ctx context.Context, keys []string) (map[string]interface{}, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	repo := rctx.DBContext(ctx)

	userStorage, err := repo.UsersStorage().FindAllKeys(account.ID, keys)
	if err == db.ErrNoMoreRows {
		return map[string]interface{}{}, nil
	}

	all := map[string]interface{}{}
	for _, v := range userStorage {
		all[v.Key] = v.Object
	}

	return all, nil
}

// UserStorageSave saves a value to the user storage
// It returns true if the value was saved, and false with an error otherwise
func (s *Server) UserStorageSave(ctx context.Context, key string, object interface{}) (bool, error) {
	account, ok := rctx.CurrentAccount(ctx)

	oplog := rctx.Logger(ctx)

	if !ok {
		oplog.Error().Msgf("Failed to save user storage: missing account")
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	repo := rctx.DBContext(ctx)

	userStorage, _ := repo.UsersStorage().FindKey(account.ID, key)

	if userStorage == nil {
		userStorage = &data.UserStorage{}
	}

	userStorage.AccountID = account.ID
	userStorage.Key = key
	userStorage.Object = postgresql.JSONB{Data: object}
	userStorage.UpdatedAt = data.TimeNowUTCPtr()

	err := repo.Save(userStorage)

	if err != nil {
		oplog.Error().Msgf("Failed to save user storage: %v", err)
		return false, proto.WrapFailf(err, "failed to save object")
	}

	if userStorage.Key == "tutorial_progress" {
		tutorials, ok := object.([]interface{})
		if ok {
			levels := []int{}
			for k := range tutorials {
				if level, ok := tutorials[k].(float64); ok {
					levels = append(levels, int(level))
				}
			}
			r := rctx.HTTPRequest(ctx)
			if err := s.Analytics.TrackTutorialEnd(r, account.ID, levels); err != nil {
				oplog.Err(err).Msg("TrackTutorialEnd")
			}
		}
	}

	return true, nil
}

func (s *Server) UserStorageDelete(ctx context.Context, key string) (bool, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	repo := rctx.DBContext(ctx)

	err := repo.UsersStorage().DeleteKey(account.ID, key)

	if err != nil && err != db.ErrNoMoreRows {
		return false, proto.ErrorInternal("failed to delete user storage data %v", err)
	}

	return true, nil
}
