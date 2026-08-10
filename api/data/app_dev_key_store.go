package data

import (
	"crypto/rand"
	"fmt"
	"sync"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/pkg/errors"
	"github.com/upper/db/v4"
)

type AppDevKey struct {
	*proto.AppDevKey
}

func (a *AppDevKey) Store(sess db.Session) db.Store {
	return DB.AppDevKeys(sess)
}

func (a *AppDevKey) Validate() error {
	if a.Name == "" {
		return proto.ErrorInvalidArgument("name", "is empty")
	}
	if a.Email == "" {
		return proto.ErrorInvalidArgument("email", "is empty")
	}
	if len(a.AppKey) <= 5 {
		return proto.ErrorInvalidArgument("appkey", "must be 6 chars or longer")
	}
	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &Account{}
)

type AppDevKeyStore struct {
	db.Collection
}

type appDevKeyCache struct {
	cache          map[string]appDevKeyCacheEntry
	cacheLastEvict time.Time
	mu             sync.Mutex
}

var appDevKeyCacheStore = appDevKeyCache{
	cache:          map[string]appDevKeyCacheEntry{},
	cacheLastEvict: time.Now().UTC(),
}

func (s *AppDevKeyStore) FindAll() ([]*AppDevKey, error) {
	var appDevKeys []*AppDevKey
	err := s.Find(db.Cond{}).All(&appDevKeys)
	if err != nil {
		return nil, err
	}
	return appDevKeys, nil
}

func (s *AppDevKeyStore) FindOne(conds ...interface{}) (*AppDevKey, error) {
	var appDevKey AppDevKey
	err := s.Find(conds...).One(&appDevKey)
	if err != nil {
		return nil, err
	}
	return &appDevKey, nil
}

func (s *AppDevKeyStore) FindByApiKey(appKey string, skipCache bool) (*AppDevKey, error) {
	appDevKeyCacheStore.mu.Lock()
	defer appDevKeyCacheStore.mu.Unlock()

	if appKey == "" {
		return nil, db.ErrNoMoreRows
	}

	now := time.Now().UTC()

	if !skipCache {
		// evict all old keys
		if appDevKeyCacheStore.cacheLastEvict.Add(appDevKeyCacheTTL).Before(now) {
			for k, v := range appDevKeyCacheStore.cache {
				if v.ts.Add(appDevKeyCacheTTL).Before(now) {
					delete(appDevKeyCacheStore.cache, k) // delete if expired
				}
			}
			appDevKeyCacheStore.cacheLastEvict = now
		}

		// check cache match
		entry, ok := appDevKeyCacheStore.cache[appKey]
		if ok && entry.record != nil {
			return entry.record, nil
		}
	}

	// query new data and add to cache
	appDevKey, err := s.FindOne(db.Cond{"app_key": appKey})
	if err != nil && err != db.ErrNoMoreRows {
		return nil, err
	}
	appDevKeyCacheStore.cache[appKey] = appDevKeyCacheEntry{record: appDevKey, ts: now}

	return appDevKey, err
}

func (s *AppDevKeyStore) FindByID(id uint64) (*AppDevKey, error) {
	var appDevKey AppDevKey
	err := s.Find(id).One(&appDevKey)
	if err != nil {
		if errors.Is(err, db.ErrNoMoreRows) {
			return nil, errors.New("not found")
		}
		return nil, errors.Wrapf(err, "retrieve app key")
	}

	return &appDevKey, nil
}

func (s *AppDevKeyStore) UpdateDisabled(id uint64, disabled bool, updatedByID proto.AccountID) (bool, error) {
	appDevKey, err := s.FindByID(id)
	if err != nil {
		return false, err
	}

	appDevKey.Disabled = disabled
	appDevKey.UpdatedBy = &updatedByID

	err = s.Session().Save(appDevKey)
	if err != nil {
		return false, errors.Wrapf(err, "save app dev key")
	}

	return true, nil
}

// GenerateAppDevKey generates a 32-char key
func GenerateRandomAppKey() (string, error) {
	buf := make([]byte, 14)
	_, err := rand.Read(buf)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("SW01%02x", buf), nil
}

const appDevKeyCacheTTL = 5 * time.Minute

type appDevKeyCacheEntry struct {
	record *AppDevKey
	ts     time.Time
}
