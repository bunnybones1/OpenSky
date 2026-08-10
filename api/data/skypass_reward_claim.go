package data

import (
	"database/sql/driver"
	"time"

	"github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/postgresql"

	"github.com/horizon-games/OpenSky/api/proto"
)

type SkypassRewardClaim struct {
	SkypassRewardID uint64                    `db:"skypass_rewards_id"`
	AccountID       proto.AccountID           `db:"account_id"`
	CreatedAt       *time.Time                `db:"created_at,omitempty"`
	Rewards         SkypassRewardClaimRewards `db:"rewards,omitempty"`
}

func (s *SkypassRewardClaim) Store(sess db.Session) db.Store {
	return DB.SkypassRewardsClaims(sess)
}

func (s *SkypassRewardClaim) Validate() error {
	return nil
}

type SkypassRewardClaimRewards []*proto.Reward

func (r SkypassRewardClaimRewards) Value() (driver.Value, error) {
	return postgresql.JSONBValue(r)
}

func (r *SkypassRewardClaimRewards) Scan(src interface{}) error {
	return postgresql.ScanJSONB(r, src)
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &SkypassRewardClaim{}
)

type SkypassRewardsClaimsStore struct {
	db.Collection
}
