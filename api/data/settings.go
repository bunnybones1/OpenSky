package data

import (
	"database/sql/driver"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/postgresql"
)

type SettingsKey string

const (
	SettingKeyConquestV2Pool SettingsKey = "conquest_v2_pool"
)

// Settings stores dynamic settings.
// To store or retrieve the object, create a custom wrapper handling "object" value
// like settingsConquestV2PoolWrapper does.
type Settings struct {
	Key       SettingsKey `json:"-" db:"key"`
	UpdatedAt *time.Time  `json:"-" db:"created_at,omitempty"`
	CreatedAt *time.Time  `json:"-" db:"updated_at,omitempty"`
}

func (s *Settings) Store(sess db.Session) db.Store {
	return DB.Settings(sess)
}

func (s *Settings) Validate() error {
	if s.Key == "" {
		return errors.New("key cannot be empty")
	}

	if len(s.Key) > 50 {
		return errors.New("key is too long")
	}

	s.Key = SettingsKey(strings.ToLower(string(s.Key)))

	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &Settings{}
)

type SettingsStore struct {
	db.Collection
}

// SaveConquestV2Pool inserts or updates SettingsConquestV2Pool in DB.
func (s *SettingsStore) SaveConquestV2Pool(conquestV2Pool *SettingsConquestV2Pool) error {
	if conquestV2Pool == nil {
		return fmt.Errorf("pool cannot be nil")
	}

	settings := &settingsConquestV2PoolWrapper{
		Settings: &Settings{
			Key: SettingKeyConquestV2Pool,
		},
		Object: conquestV2Pool,
	}

	err := s.Session().Save(settings)
	if err != nil {
		return fmt.Errorf("update %q: %w", SettingKeyConquestV2Pool, err)
	}

	return nil
}

// FindConquestV2Pool finds an existing SettingsConquestV2Pool or returns with default values.
func (s *SettingsStore) FindConquestV2Pool() (*SettingsConquestV2Pool, error) {
	var settings *settingsConquestV2PoolWrapper

	if err := s.Find(db.Cond{"key": SettingKeyConquestV2Pool}).One(&settings); err != nil {
		if err == db.ErrNoMoreRows {
			return &SettingsConquestV2Pool{}, nil
		}

		return nil, fmt.Errorf("find %q: %w", SettingKeyConquestV2Pool, err)
	}

	return settings.Object, nil
}

type settingsConquestV2PoolWrapper struct {
	*Settings

	Object *SettingsConquestV2Pool `db:"object"`
}

type SettingsConquestV2Pool struct {
	PoolCeiling           int32   `json:"pool_ceiling"`
	PoolFloor             int32   `json:"pool_floor"`
	TopWeightUnitPrice    float32 `json:"top_weight_unit_price"`
	BottomWeightUnitPrice float32 `json:"bottom_weight_unit_price"`
	WeightPerSilverCard   float32 `json:"weight_per_silver_card"`
}

func (s *SettingsConquestV2Pool) Value() (driver.Value, error) {
	return postgresql.JSONBValue(s)
}

func (s *SettingsConquestV2Pool) Scan(src interface{}) error {
	return postgresql.ScanJSONB(s, src)
}
