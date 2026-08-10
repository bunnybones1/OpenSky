package skypass

import (
	"context"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	sticker1Level uint16 = 5
	sticker1ID    uint64 = 19
	sticker2Level uint16 = 25
	sticker2ID    uint64 = 51

	registrationEventSamsung = "samsung"
)

var targetSeasons = map[uint16]struct{}{
	17: {},
	18: {},
}

// SamsungListerRuleApplier applies a rule as following:
// As per our agreement with Samsung, Samsung users will get 2 free stickers added to the skypass.
// To do this, we need two things:
// 1) Add a field to account creation like "accountOrigin" and webapp can then flag users as Samsung on account creation (webapp will have this information).
// 2) For users that have the Galaxystore accountOrigin field, we add 2 stickers to their free pass (overriding any starter or free reward at these levels.
//
// Sticker 1: 19 @ Level 5
// Sticker 2: 51 @ Level 25
type SamsungListerRuleApplier struct {
}

func NewSamsungListerRuleApplier() *SamsungListerRuleApplier {
	return &SamsungListerRuleApplier{}
}

func (s SamsungListerRuleApplier) Apply(ctx context.Context, accountID proto.AccountID, levels []*proto.SkypassLevel, stat *data.SkypassSeasonStat) ([]*proto.SkypassLevel, error) {
	var account *data.Account

	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		var err error

		account, err = data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			return fmt.Errorf("find account: %w", err)
		}

		return nil
	}, nil)
	if err != nil {
		return nil, err
	}

	if account.PrivateSettings == nil || account.PrivateSettings.RegistrationEvent == nil || *account.PrivateSettings.RegistrationEvent != registrationEventSamsung {
		return levels, nil
	}

	for _, level := range levels {
		if level.Level != sticker1Level && level.Level != sticker2Level {
			continue
		}

		for _, reward := range level.Rewards {
			if _, ok := targetSeasons[reward.Season]; !ok {
				continue
			}

			if *reward.Tier != proto.SkypassTier_FREE {
				continue
			}

			var stickerID uint64

			switch reward.Level {
			case sticker1Level:
				stickerID = sticker1ID
			case sticker2Level:
				stickerID = sticker2ID
			}

			reward.ItemType = proto.ItemTypePtr(proto.ItemType_SW_STICKERS)
			reward.IsStarter = false
			reward.Amount = 0
			reward.Claimable = true
			reward.IsInfinite = false
			reward.Attributes = &proto.SkypassRewardAttributes{
				TokenIDs: []uint64{stickerID},
			}
		}
	}

	return levels, nil
}
