package data

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

// invalidation regexp for account username
var (
	AccountNameRex = regexp.MustCompile(`[^\w\-\.]`)
	assetIDRegexp  = regexp.MustCompile(`^[\w\-_]+$`)

	defaultAccountSettings = proto.AccountSettings{
		HidePlayerNames:        SetBoolPointer(false),
		Suspended:              SetBoolPointer(false),
		RequestMoreInvites:     SetBoolPointer(false),
		StarterDeckV2Migration: SetBoolPointer(true),
	}

	BannedStatuses = []proto.AccountStatus{
		proto.AccountStatus_BANNED,
		proto.AccountStatus_SUSPENDED,
		proto.AccountStatus_DELETED,
	}

	// List of account statuses that are considered "active" and able to
	// participate in mechanics like invite-a-friend.
	ActiveStatuses = []proto.AccountStatus{
		proto.AccountStatus_ACTIVE,
		proto.AccountStatus_VIP,
		proto.AccountStatus_SUSPENDED,
		proto.AccountStatus_FLAGGED,
		proto.AccountStatus_TO_DELETE,
	}

	BaseGameModes = []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
	}
)

func SetBoolPointer(v bool) *bool {
	b := v
	return &b
}

// Account represents a single account. This struct wraps *proto.Account and adds
// additional methods
type Account struct {
	*proto.Account
}

func (a *Account) Store(sess db.Session) db.Store {
	return DB.Accounts(sess)
}

// Validate returns an error if the account does not pass validation rules.
func (a *Account) Validate() error {
	if !a.Address.IsValidAddress() {
		return fmt.Errorf("address %s is invalid", a.Address)
	}

	if a.TagArtID != nil {
		if *a.TagArtID == "" {
			a.TagArtID = nil
		} else if !assetIDRegexp.MatchString(*a.TagArtID) || len(*a.TagArtID) > 20 {
			return proto.ErrorInvalidArgument("tagArtID", "account art is invalid")
		}
	}
	// remove leading and trailing spaces
	a.Name = strings.TrimSpace(a.Name)

	return nil
}

func (a *Account) ValidateName() error {
	// remove leading and trailing spaces
	a.Name = strings.TrimSpace(a.Name)

	// validate name (aka username / alias)
	if len(a.Name) < accountNameMinLen {
		return proto.ErrorInvalidArgument("name", fmt.Sprintf("name too short, minimum length is %d characters", accountNameMinLen))
	}
	if len(a.Name) > accountNameMaxLen {
		return proto.ErrorInvalidArgument("name", fmt.Sprintf("name too long, maximum length is %d characters", accountNameMaxLen))
	}
	if AccountNameRex.MatchString(a.Name) {
		return proto.ErrorInvalidArgument("name", "name contains characters that are not allowed, use only letters, digits, dash (-), underscore (_) and dot")
	}

	return nil
}

func (a *Account) RefreshSpectateCode(sess db.Session, forceReset bool) error {
	matchInProgress, err := DB.Matches(sess).Find(db.And(
		db.Or(
			db.Cond{"p1_id": a.ID},
			db.Cond{"p2_id": a.ID},
		),
		db.Cond{"status": proto.MatchStatus_IN_PROGRESS},
	)).Exists()
	if err != nil {
		return err
	}

	if a.PrivateSettings == nil {
		a.PrivateSettings = DefaultAccountSettings()
	}

	// always set code if none is present
	if a.PrivateSettings.SpectateCode == nil || *a.PrivateSettings.SpectateCode == "" {
		forceReset = true
	}

	// auto reset expired code if outside of match
	if !matchInProgress && (a.PrivateSettings.SpectateCodeExpiresAt == nil || a.PrivateSettings.SpectateCodeExpiresAt.Before(time.Now())) {
		forceReset = true
	}

	if forceReset {
		code := uuid.NewString()
		expiry := time.Now().UTC().Add(24 * time.Hour * 60)
		a.PrivateSettings.SpectateCode = &code
		a.PrivateSettings.SpectateCodeExpiresAt = &expiry
		if err := sess.Save(a); err != nil {
			return err
		}
	}

	return nil
}

// BeforeCreate satisfies db.BeforeCreateHook.
func (a *Account) BeforeCreate(sess db.Session) error {
	if err := a.beforeSave(sess); err != nil {
		return err
	}
	return nil
}

// BeforeUpdate satisfies db.BeforeUpdateHook.
func (a *Account) BeforeUpdate(sess db.Session) error {
	if err := a.beforeSave(sess); err != nil {
		return err
	}
	return nil
}

func (a *Account) beforeSave(_ db.Session) error {
	if a.Settings != nil {
		// make sure nobody is updating public facing settings that are not being saved
		return errors.New("updated public facing settings")
	}
	return nil
}

func DefaultAccountSettings() *proto.AccountSettingsWrapper {
	return &proto.AccountSettingsWrapper{
		AccountSettings: defaultAccountSettings,
	}
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &Account{}
)
