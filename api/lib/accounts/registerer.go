package accounts

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

type Registerer struct {
	logger           zerolog.Logger
	nameGenerator    NameGenerator
	analyticsTracker analytics.Tracker

	allAccountsAdmin bool
}

func NewRegisterer(cfg *config.Config, logger zerolog.Logger, nameGenerator NameGenerator, analyticsTracker analytics.Tracker) *Registerer {
	return &Registerer{
		logger:           logger.With().Str("fn", "accounts.Registerer").Logger(),
		nameGenerator:    nameGenerator,
		analyticsTracker: analyticsTracker,
		allAccountsAdmin: cfg.OpenSky.GameMaster.AllAccountsAdmin,
	}
}

func (r *Registerer) SetAnalyticsTracker(analyticsTracker analytics.Tracker) {
	r.analyticsTracker = analyticsTracker
}

func (r *Registerer) Register(ctx context.Context, sess db.Session, req *proto.AccountRegistration) (*data.Account, error) {
	account := &data.Account{Account: &proto.Account{}}

	// Set account request data if provided
	account.Address = proto.HashFromString(req.Address.String())
	account.Locale = req.Locale
	account.TagArtID = req.TagArtID
	account.PrivateSettings = data.DefaultAccountSettings()

	if req.Name != nil {
		account.Name = *req.Name
	}

	if len(account.Name) == 0 {
		var err error

		account.Name, err = r.nameGenerator.GenerateFromAddress(sess, account.Address)
		if err != nil {
			r.logger.Err(err).Msg("generate name")

			return nil, proto.ErrorInternal("generating name failed")
		}
	}

	if r.allAccountsAdmin {
		account.Admin = true
	}

	if req.InvitedBy != nil {
		inviter, err := data.DB.Accounts(sess).FindByAddress(*req.InvitedBy)
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			r.logger.Err(err).Msgf("find inviter account")

			return nil, fmt.Errorf("finding inviter failed")
		}

		if inviter == nil {
			r.logger.Error().Msgf("cannot find inviter %s", *req.InvitedBy)

			return nil, proto.ErrorInvalidArgument("invited by", "cannot find inviter")
		}

		if account.Address == inviter.Address {
			r.logger.Error().Msgf("cannot set yourself as inviter %d", inviter.ID)

			return nil, proto.ErrorInvalidArgument("invited by", "you cannot set yourself as inviter")
		}

		account.InvitedByID = &inviter.ID
		account.InvitedBy = &inviter.Address
	}

	if req.RegistrationEvent != nil {
		registrationEvent := strings.ToLower(strings.TrimSpace(*req.RegistrationEvent))

		if len(registrationEvent) > 0 {
			account.PrivateSettings.RegistrationEvent = &registrationEvent
		}
	}

	if req.IsBurnerWallet != nil && *req.IsBurnerWallet {
		account.PrivateSettings.BurnerAddress = &account.Address
	}

	if err := account.Validate(); err != nil {
		return nil, fmt.Errorf("account validation: %w", err)
	}

	if account.PrivateSettings.BurnerAddress == nil {
		if err := account.ValidateName(); err != nil {
			return nil, fmt.Errorf("name validation: %w", err)
		}
	}

	existingAccount, _ := data.DB.Accounts(sess).FindByAddress(account.Address)
	if existingAccount != nil {
		// consider it to be okay, just return the account without saving anything new
		return existingAccount, nil
	}

	existingAccount, _ = data.DB.Accounts(sess).FindByName(account.Name)
	if existingAccount != nil {
		return nil, proto.ErrorInvalidArgument("account username", "is taken")
	}

	if err := sess.Save(account); err != nil {
		// check if this is a duplicate error of same account creation, etc.. in which case
		// just return back the same account. This is a bit of a hack, but its strange to be happening.
		// Seems to be some kind of timing error, or the frontend is double-sending requests
		if strings.Contains(err.Error(), "account_unique_name_idx") {
			existingAccount, _ := data.DB.Accounts(sess).FindByName(account.Name)
			if existingAccount == nil {
				// this should never happen, as the error just told us, there was a dupe unique name..
				r.logger.Warn().Msgf("could not find dupe name? hmm, db err %v", err)

				return nil, proto.WrapError(proto.ErrInternal, err, "could not create account (b)")
			}

			if existingAccount.Address != account.Address {
				r.logger.Warn().Msgf("could not create account, as addresses do not match")

				return nil, proto.WrapError(proto.ErrInternal, err, "username is already taken.")
			}

			return existingAccount, nil
		}

		r.logger.Err(err).Msgf("create account")

		return nil, proto.WrapError(proto.ErrInternal, err, "could not create account")
	}

	if err := data.DB.Items(sess).AssignItemsToAccount(account.Address, account.ID); err != nil {
		r.logger.Err(err).Msgf("assign items to account with address %s", account.Address)

		return nil, proto.ErrorInternal("assign items to account")
	}

	if err := data.UnlockHero(sess, account.ID, proto.Hero_ADA); err != nil {
		r.logger.Err(err).Msgf("unlock hero Ada")

		return nil, proto.ErrorInternal("unlock hero Ada")
	}

	err := data.CreateStarterDecks(sess, account.ID)
	if err != nil {
		r.logger.Err(err).Msgf("create starter decks")

		return nil, proto.WrapError(proto.ErrInternal, err, "could not create starter decks")
	}

	inOneHour := time.Now().UTC().Add(time.Hour)
	err = data.DB.Tasks(sess).EnqueueTask(jobqueue.DetectSimilarUsernamesQueue, jobqueue.DetectSimilarUsernames{
		AccountID: account.ID,
	}, &inOneHour, &account.ID)
	if err != nil {
		r.logger.Debug().Msgf("failed to queue similar usernames check, db err %v", err)
	}

	inOneDay := time.Now().UTC().Add(time.Hour * 24)

	err = data.DB.Tasks(sess).EnqueueTask(jobqueue.DetectSharedIPsQueue, jobqueue.DetectSharedIPs{
		AccountID: account.ID,
	}, &inOneDay, &account.ID)
	if err != nil {
		r.logger.Debug().Msgf("failed to queue shared IPs check, db err %v", err)
	}

	httpReq := rctx.HTTPRequest(ctx)
	if err := r.analyticsTracker.TrackAccountCreated(httpReq, account.ID, &req.DeviceProperties); err != nil {
		r.logger.Err(err).Msg("TrackAccountCreated")
	}

	return account, nil
}
