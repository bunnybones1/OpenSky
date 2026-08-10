//go:build integration

package rpc_test

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/0xsequence/ethkit/ethwallet"
	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"
	"github.com/0xsequence/go-sequence"
	v1 "github.com/0xsequence/go-sequence/core/v1"
	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc"
	rpcmock "github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestAccounts(t *testing.T) {
	var analyticsTracker *analyticsMock.MockTracker

	var wallet *ethwallet.Wallet

	var address, ajwtToken string

	var accountID, adminAccountID proto.AccountID

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			analyticsTracker = analyticsMock.NewMockTracker(ctrl)

			apiService := apitest.APIService()

			originalAnalyticsTracker := apiService.RPC.Analytics

			apiService.RPC.Analytics = analyticsTracker
			apiService.RPC.Leveller.(analytics.TrackerSetter).SetAnalyticsTracker(analyticsTracker)
			apiService.RPC.AccountRegisterer.(analytics.TrackerSetter).SetAnalyticsTracker(analyticsTracker)

			t.Cleanup(func() {
				apiService.RPC.Analytics = originalAnalyticsTracker
				apiService.RPC.Leveller.(analytics.TrackerSetter).SetAnalyticsTracker(originalAnalyticsTracker)
				apiService.RPC.AccountRegisterer.(analytics.TrackerSetter).SetAnalyticsTracker(originalAnalyticsTracker)
			})
		}

		// Account
		{
			var err error

			var walletAuthProof string

			// Get an auth token via wallet proof
			walletAuthProof, wallet, err = apitest.EthAuthWalletProof(apitest.TestMnemonic)
			assert.NotNil(t, wallet)
			assert.NoError(t, err)
			assert.NotEmpty(t, walletAuthProof)

			var status bool

			var account *proto.Account

			status, ajwtToken, address, account, err = apitest.Client().GetAuthToken(context.Background(), walletAuthProof)
			assert.True(t, status)
			assert.NoError(t, err)
			assert.NotNil(t, wallet)
			assert.Equal(t, strings.ToLower(wallet.Address().String()), strings.ToLower(address))
			assert.Nil(t, account)
			assert.NotEmpty(t, ajwtToken)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestAccounts-admin")
			require.NoError(t, err)
		}
	}

	// Reject unauthed requests
	{
		_, err := apitest.Client().UpdateAccount(context.Background(), &proto.Account{
			Address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
			Name:    "boo",
		})
		assert.Error(t, err)
		assert.ErrorContains(t, err, "webrpc unauthenticated error: unauthorized")
	}

	// Get account -- initially doesn't exist
	{
		account, err := apitest.Client().GetAccount(context.Background(), "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1")
		assert.Nil(t, account)
		assert.NoError(t, err)
	}

	var item *data.Item
	// Set items balance from chain
	{
		contractAddress := apitest.RandomAddress()
		addressHash := proto.HashFromString(address)
		item = &data.Item{Item: &proto.Item{
			AccountAddress:  &addressHash,
			ContractAddress: &contractAddress,
			ItemType:        proto.ItemType_SW_SILVER_CARDS,
			TokenID:         1,
			Balance:         prototyp.NewBigInt(1),
		}}
		err := data.DB.Save(item)
		require.NoError(t, err)
	}

	t.Run("register account", func(t *testing.T) {
		walletAuthProof2, _, err := apitest.EthAuthWalletProof("program first teach gloom demise hundred keep beach panel science original consider")
		require.NoError(t, err)

		_, ajwtToken2, _, _, err := apitest.Client().GetAuthToken(context.Background(), walletAuthProof2)
		require.NoError(t, err)

		username := "elux101"

		t.Run("success", func(t *testing.T) {

			analyticsTracker.EXPECT().TrackAccountCreated(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(
				func(r *http.Request, accountID proto.AccountID, device *proto.DeviceProperties) error {
					assert.NotNil(t, accountID)
					return nil
				})

			registrationEvent := "Some-Event"
			accountToBeRegistered := &proto.AccountRegistration{
				Name:              &username,
				DeviceProperties:  proto.DeviceProperties{},
				RegistrationEvent: &registrationEvent,
			}

			status, account, err := apitest.Client().RegisterAccount(apitest.AuthHeaderContext(ajwtToken), accountToBeRegistered, "")
			assert.NoError(t, err)
			assert.True(t, status)
			assert.NotNil(t, account)

			accountID = account.ID

			t.Run("does not fail and returns the account when the account already exists", func(t *testing.T) {
				accountToBeRegistered := &proto.AccountRegistration{
					Name:             &username,
					DeviceProperties: proto.DeviceProperties{},
				}

				status, account, err := apitest.Client().RegisterAccount(apitest.AuthHeaderContext(ajwtToken), accountToBeRegistered, "")
				assert.NoError(t, err)
				assert.True(t, status)
				assert.NotNil(t, account)
			})
		})

		t.Run("fails when the address is invalid", func(t *testing.T) {
			accountToBeRegistered := &proto.AccountRegistration{
				Address:          apitest.RandomAddress(),
				Name:             &username,
				DeviceProperties: proto.DeviceProperties{},
			}

			status, account, err := apitest.Client().RegisterAccount(apitest.AuthHeaderContext(ajwtToken2), accountToBeRegistered, "")
			assert.ErrorContains(t, err, "address does not match your auth token")
			assert.False(t, status)
			assert.Nil(t, account)
		})

		// Note: Testing a case when the address already exists is not possible as when
		// we use the JWT token of already existing account the middleware changes the session type
		// which is then not authorized to call "RegisterAccount" method.
		// The only possible real scenario is when there is a race condition of triggering "RegisterAccount"
		// from the webapp multiple times at the same time.

		t.Run("fails when the username already exists", func(t *testing.T) {
			accountToBeRegistered := &proto.AccountRegistration{
				Name:             &username,
				DeviceProperties: proto.DeviceProperties{},
			}

			status, account, err := apitest.Client().RegisterAccount(apitest.AuthHeaderContext(ajwtToken2), accountToBeRegistered, "")
			assert.ErrorContains(t, err, "account username is taken")
			assert.False(t, status)
			assert.Nil(t, account)
		})
	})

	// Get account (with concurrency)
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)

		go func(t *testing.T) {
			defer wg.Done()

			a, err := apitest.Client().GetAccount(context.Background(), wallet.Address().String())
			assert.NoError(t, err)
			assert.NotNil(t, a)
			assert.Equal(t, a.Address.String(), strings.ToLower(wallet.Address().String()))
		}(t)
	}
	wg.Wait()

	accountCtx := apitest.AccountContext(accountID)

	// Items from chain are assigned to an account
	{
		storedItem, err := data.DB.Items().FindOne(db.Cond{"id": item.ID})
		require.NoError(t, err)
		assert.Equal(t, accountID, storedItem.AccountID)
	}

	// Get session
	{
		add, accountFromGetSession, err := apitest.Client().GetSession(apitest.AuthHeaderContext(ajwtToken))
		assert.NoError(t, err)
		assert.Equal(t, strings.ToLower(wallet.Address().String()), add)
		assert.Equal(t, strings.ToLower(wallet.Address().String()), accountFromGetSession.Address.String())

		accountFromGetAccount, err := apitest.Client().GetAccount(apitest.AuthHeaderContext(ajwtToken), accountFromGetSession.Address.String())
		assert.NoError(t, err)

		assert.Equal(t, accountFromGetSession, accountFromGetAccount)
	}

	// Reject Update account with invalid address from whats on authorized context
	{
		_, err := apitest.Client().UpdateAccount(accountCtx, &proto.Account{
			Address: "try-to-fake",
			Name:    "peter",
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), `invalid`)
	}

	// Increase account level
	{
		analyticsTracker.EXPECT().TrackLevelUps(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any())

		ok, err := apitest.Client().GMGiveLevels(apitest.AccountContext(adminAccountID), &address, 3)
		require.NoError(t, err)
		assert.True(t, ok)
	}

	t.Run("get account", func(t *testing.T) {
		r, err := apitest.Client().GetAccount(context.Background(), address)
		assert.NoError(t, err)
		assert.Equal(t, r.Address.String(), address)
		assert.Equal(t, accountID, r.ID)
		assert.NotNil(t, r.Stats)

		// Make sure InternalPlayerRankState does not carry data
		assert.Zero(t, r.Stats.RankedConstructed.PlayerRankState.R)
		assert.Nil(t, r.Stats.RankedConstructed.InternalPlayerRankState)
		assert.Zero(t, r.Stats.RankedDiscovery.PlayerRankState.RP)
		assert.Nil(t, r.Stats.RankedDiscovery.InternalPlayerRankState)

		// Assert default stats
		assert.NotNil(t, r.Stats.RankedConstructed)
		assert.Equal(t, proto.GameMode_RANKED_CONSTRUCTED, r.Stats.RankedConstructed.GameMode)
		assert.Equal(t, proto.PlayerRank_WANDERER, r.Stats.RankedConstructed.PlayerRank)
		assert.Equal(t, ranking.DefaultRP, *r.Stats.RankedConstructed.Score, "default ranked score")

		assert.NotNil(t, r.Stats.RankedDiscovery)
		assert.Equal(t, proto.GameMode_RANKED_DISCOVERY, r.Stats.RankedDiscovery.GameMode)
		assert.Equal(t, proto.PlayerRank_WANDERER, r.Stats.RankedDiscovery.PlayerRank)
		assert.Equal(t, ranking.DefaultRP, *r.Stats.RankedDiscovery.Score, "default ranked score")

		assert.Nil(t, r.Stats.ConquestConstructed)
		assert.Nil(t, r.Stats.ConquestDiscovery)
	})

	t.Run("internal get account", func(t *testing.T) {
		r, err := apitest.Client().InternalGetAccount(apitest.ServiceContext(), address)
		assert.NoError(t, err)

		assert.Equal(t, r.Address.String(), address)
		assert.Equal(t, accountID, r.ID)
		assert.NotNil(t, r.Stats)

		// Starting level is 0
		assert.Equal(t, uint16(3), r.Level)
		assert.Equal(t, uint16(3), r.SeasonLevel)

		assert.NotNil(t, r.Stats.RankedConstructed)
		assert.NotNil(t, r.Stats.RankedDiscovery)

		assert.NotNil(t, r.Stats.RankedConstructed.InternalPlayerRankState)
		assert.NotNil(t, r.Stats.RankedDiscovery.InternalPlayerRankState)

		// Make sure InternalPlayerRankState carries data
		assert.Zero(t, r.Stats.RankedConstructed.PlayerRankState.R)
		assert.NotZero(t, r.Stats.RankedConstructed.InternalPlayerRankState.R)
		assert.Zero(t, r.Stats.RankedConstructed.PlayerRankState.RP)
		assert.GreaterOrEqual(t, r.Stats.RankedConstructed.InternalPlayerRankState.RP, ranking.DefaultRP)

		assert.Zero(t, r.Stats.RankedDiscovery.PlayerRankState.R)
		assert.NotZero(t, r.Stats.RankedDiscovery.InternalPlayerRankState.R)
		assert.Zero(t, r.Stats.RankedDiscovery.PlayerRankState.RP)
		assert.GreaterOrEqual(t, r.Stats.RankedDiscovery.InternalPlayerRankState.RP, ranking.DefaultRP)

		// Assert default stats
		assert.NotNil(t, r.Stats.RankedConstructed)
		assert.Equal(t, proto.GameMode_RANKED_CONSTRUCTED, r.Stats.RankedConstructed.GameMode)
		assert.Equal(t, proto.PlayerRank_WANDERER, r.Stats.RankedConstructed.PlayerRank)
		assert.Equal(t, ranking.DefaultRP, *r.Stats.RankedConstructed.Score, "default constructed score")

		assert.NotNil(t, r.Stats.RankedDiscovery)
		assert.Equal(t, proto.GameMode_RANKED_DISCOVERY, r.Stats.RankedDiscovery.GameMode)
		assert.Equal(t, proto.PlayerRank_WANDERER, r.Stats.RankedDiscovery.PlayerRank)
		assert.Equal(t, ranking.DefaultRP, *r.Stats.RankedDiscovery.Score, "default discovery score")

		assert.NotNil(t, r.Stats.ConquestConstructed)
		assert.Equal(t, proto.GameMode_CONQUEST_CONSTRUCTED, r.Stats.ConquestConstructed.GameMode)
		assert.Equal(t, proto.PlayerRank_UNRANKED, r.Stats.ConquestConstructed.PlayerRank)
		assert.Equal(t, int32(0), *r.Stats.ConquestConstructed.Score, "default conquest score")

		assert.NotNil(t, r.Stats.ConquestDiscovery)
		assert.Equal(t, proto.GameMode_CONQUEST_DISCOVERY, r.Stats.ConquestDiscovery.GameMode)
		assert.Equal(t, proto.PlayerRank_UNRANKED, r.Stats.ConquestDiscovery.PlayerRank)
		assert.Equal(t, int32(0), *r.Stats.ConquestDiscovery.Score, "default conquest score")

		assert.NotEmpty(t, r.Settings.RegistrationEvent)
	})

	// Check starter deck
	{
		var decks []*data.Deck

		err := data.DB.Decks().Find(db.Cond{
			"account_id": accountID,
			"deck_type":  proto.DeckType_UNLOCKED_STARTER,
		}).All(&decks)
		require.NoError(t, err)

		require.Len(t, decks, 1)
		unlockedDeck := decks[0]

		var initialStarterDeck *proto.Deck

		for _, starterDeck := range data.GetStarterDecks() {
			if starterDeck.DeckType == proto.DeckType_UNLOCKED_STARTER {
				initialStarterDeck = starterDeck
				break
			}
		}

		assert.Equal(t, initialStarterDeck.Class, unlockedDeck.Class)
		assert.Equal(t, initialStarterDeck.CardIDs, unlockedDeck.CardIDs)

		count, err := data.DB.Items().Find(db.Cond{
			"account_id": accountID,
			"item_type":  proto.ItemType_SW_BASE_CARDS,
			"token_id":   db.AnyOf(unlockedDeck.CardIDs),
		}).Count()
		require.NoError(t, err)
		assert.Equal(t, len(unlockedDeck.CardIDs), int(count))

		count, err = data.DB.Items().Find(db.Cond{
			"account_id": accountID,
			"item_type":  proto.ItemType_SW_HERO,
			"token_id":   data.DeckClassHero(initialStarterDeck.Class),
		}).Count()
		require.NoError(t, err)
		assert.Equal(t, 1, int(count))
	}

	// List unlocked decks
	{
		resp, err := apitest.Client().InternalListUnlockedDeckStrings(apitest.ServiceContext(), &proto.InternalListUnlockedDeckStringsRequest{AccountAddress: proto.HashFromString(address)})
		assert.NoError(t, err)

		assert.NotZero(t, resp)
	}

	// Update account - with auth
	{
		resp, err := apitest.Client().UpdateAccount(accountCtx, &proto.Account{
			Address: proto.HashFromString(address),
			Name:    "peterk",
		})
		assert.NoError(t, err)
		assert.Equal(t, resp.Address.String(), address)
		assert.Equal(t, resp.Name, "peterk")
	}

	// Get account by name
	{
		r, err := apitest.Client().GetAccountByUsername(context.Background(), "  PeTeRK")
		assert.NoError(t, err)
		assert.Equal(t, r.Address.String(), address)
		assert.NotNil(t, r.Stats)
		assert.NotNil(t, r.Stats.RankedConstructed)
		assert.NotNil(t, r.Stats.RankedDiscovery)

		// Make sure InternalPlayerRankState does not carry data
		assert.Zero(t, r.Stats.RankedConstructed.PlayerRankState.R)
		assert.Nil(t, r.Stats.RankedConstructed.InternalPlayerRankState)
		assert.Zero(t, r.Stats.RankedDiscovery.PlayerRankState.RP)
		assert.Nil(t, r.Stats.RankedDiscovery.InternalPlayerRankState)
	}

	// Get account by name with a weird argument
	{
		_, err := apitest.Client().GetAccountByUsername(context.Background(), `  PETE'RK`)
		assert.Error(t, err)
		assert.Equal(t, "webrpc not found error: account not found", err.Error())
	}

	// Update account with duplicate
	{
		resp, err := apitest.Client().UpdateAccount(accountCtx, &proto.Account{
			Address: proto.HashFromString(address),
			Name:    "Johnny",
		})
		assert.NoError(t, err)
		assert.Equal(t, resp.Name, "Johnny")
	}

	t.Run("spectate code", func(t *testing.T) {
		spectateCode, err := apitest.Client().GetPrivateSpectateCode(accountCtx, nil)
		assert.NoError(t, err)
		assert.NotNil(t, spectateCode)

		t.Run("is provided when the logged account is the same as the requested one", func(t *testing.T) {
			r, err := apitest.Client().GetAccount(accountCtx, address)
			assert.NoError(t, err)
			assert.Equal(t, r.Address.String(), address)
			assert.Equal(t, spectateCode, *r.Settings.SpectateCode)
			assert.NotNil(t, r.Settings.SpectateCodeExpiresAt)
		})

		t.Run("is provided when the logged account is an admin", func(t *testing.T) {
			r, err := apitest.Client().GetAccount(apitest.AccountContext(adminAccountID), address)
			assert.NoError(t, err)
			assert.Equal(t, r.Address.String(), address)
			assert.Equal(t, spectateCode, *r.Settings.SpectateCode)
			assert.NotNil(t, r.Settings.SpectateCodeExpiresAt)
		})

		t.Run("is provided when the logged account is a service account", func(t *testing.T) {
			r, err := apitest.Client().GetAccount(apitest.ServiceContext(), address)
			assert.NoError(t, err)
			assert.Equal(t, r.Address.String(), address)
			assert.Equal(t, spectateCode, *r.Settings.SpectateCode)
			assert.NotNil(t, r.Settings.SpectateCodeExpiresAt)
		})

		t.Run("is not provided when the logged account is different than requested one", func(t *testing.T) {
			r, err := apitest.Client().GetAccount(context.Background(), address)
			assert.NoError(t, err)
			assert.Equal(t, r.Address.String(), address)
			require.Nil(t, r.Settings)
		})
	})

	// Update account settings
	{
		r, err := apitest.Client().GetAccount(accountCtx, address)
		assert.NoError(t, err)
		assert.Equal(t, r.Address.String(), address)
		require.NotNil(t, r.Settings)
		assert.False(t, *r.Settings.RequestMoreInvites)
		assert.Nil(t, r.Settings.TwitchProfile)

		twitchProfile := "TwitchUser123"

		resp, err := apitest.Client().UpdateAccount(accountCtx, &proto.Account{
			Address: proto.HashFromString(address),
			Name:    "Johnny",
			Settings: &proto.AccountSettingsWrapper{
				AccountSettings: proto.AccountSettings{
					RequestMoreInvites: data.SetBoolPointer(true),
					TwitchProfile:      &twitchProfile,
				},
			},
		})
		assert.NoError(t, err)
		assert.NotNil(t, resp.Settings)
		require.NotNil(t, resp.Settings.RequestMoreInvites)
		assert.True(t, *resp.Settings.RequestMoreInvites)
		assert.Equal(t, twitchProfile, *resp.Settings.TwitchProfile)

		r, err = apitest.Client().GetAccount(accountCtx, address)
		assert.NoError(t, err)
		assert.Equal(t, r.Address.String(), address)
		require.NotNil(t, r.Settings)
		require.NotNil(t, r.Settings.RequestMoreInvites)
		assert.True(t, *r.Settings.RequestMoreInvites)
		assert.Equal(t, twitchProfile, *r.Settings.TwitchProfile)
	}

	t.Run("update title", func(t *testing.T) {
		title := &data.Item{
			Item: &proto.Item{
				AccountID: accountID,
				ItemType:  proto.ItemType_SW_TITLES,
				TokenID:   1,
				Balance:   prototyp.NewBigInt(1),
			},
		}
		err := data.DB.Save(title)
		require.NoError(t, err)

		account, err := apitest.Client().GetAccount(accountCtx, address)
		require.NoError(t, err)

		t.Run("success when title is owned", func(t *testing.T) {
			account.TitleID = &title.TokenID

			resp, err := apitest.Client().UpdateAccount(accountCtx, account)
			require.NoError(t, err)
			require.NotNil(t, resp.TitleID)
			assert.Equal(t, title.TokenID, *resp.TitleID)

			resp, err = apitest.Client().GetAccount(accountCtx, address)
			require.NoError(t, err)
			require.NotNil(t, resp.TitleID)
			assert.Equal(t, title.TokenID, *resp.TitleID)
		})

		t.Run("fails when title is not owned", func(t *testing.T) {
			titleID := uint64(2)

			account.TitleID = &titleID

			resp, err := apitest.Client().UpdateAccount(accountCtx, account)
			require.Error(t, err)
			assert.Nil(t, resp)
		})
	})

	// Account exists - no
	{
		resp, _, err := apitest.Client().AccountExists(accountCtx, "zzz")
		assert.NoError(t, err)
		assert.False(t, resp)
	}

	{
		resp, _, err := apitest.Client().AccountExistsByName(accountCtx, "zzz")
		assert.NoError(t, err)
		assert.False(t, resp)
	}

	// Account exists - yes
	{
		resp, _, err := apitest.Client().AccountExists(accountCtx, address)
		assert.NoError(t, err)
		assert.True(t, resp)
	}

	{
		a, err := apitest.Client().GetAccount(context.Background(), wallet.Address().String())
		resp, _, err := apitest.Client().AccountExistsByName(accountCtx, a.Name)
		assert.NoError(t, err)
		assert.True(t, resp)
	}

	t.Run("request account deletion", func(t *testing.T) {
		// Setup
		var sequenceWallet *sequence.Wallet[*v1.WalletConfig]
		{
			var err error

			sequenceWallet, err = sequence.V1NewWalletSingleOwner(wallet)
			require.NoError(t, err)

			err = sequenceWallet.SetProvider(apitest.APIService().RPC.ETHProvider)
			require.NoError(t, err)

			sequenceAccount := &data.Account{Account: &proto.Account{
				Address: proto.HashFromString(sequenceWallet.Address().String()),
				Name:    "request account deletion",
			}}

			err = apitest.CreateAccount(sequenceAccount)
			require.NoError(t, err)
		}

		t.Run("fails when the message is wrong", func(t *testing.T) {
			msg := "wrong message"
			sig, err := sequenceWallet.SignMessage([]byte(rpc.PrefixEIP191Message(msg)))
			require.NoError(t, err)

			result, err := apitest.Client().RequestAccountDeletion(apitest.AccountContextFromAddress(proto.HashFromString(sequenceWallet.Address().String())), &proto.WalletProof{
				Address:   sequenceWallet.Address().String(),
				Message:   msg,
				Signature: hexutil.Encode(sig),
			})
			assert.ErrorContains(t, err, "unexpected message")
			assert.False(t, result)

			account, err := data.DB.Accounts(nil).FindByAddress(proto.HashFromString(sequenceWallet.Address().String()))
			assert.NoError(t, err)
			assert.Equal(t, proto.AccountStatus_ACTIVE, account.Status)
		})

		t.Run("fails when the signature is wrong", func(t *testing.T) {
			result, err := apitest.Client().RequestAccountDeletion(apitest.AccountContextFromAddress(proto.HashFromString(sequenceWallet.Address().String())), &proto.WalletProof{
				Address:   sequenceWallet.Address().String(),
				Message:   "message",
				Signature: hexutil.Encode([]byte("wrong signature")),
			})
			assert.ErrorContains(t, err, "failure to validate signature")
			assert.False(t, result)

			account, err := data.DB.Accounts(nil).FindByAddress(proto.HashFromString(sequenceWallet.Address().String()))
			assert.NoError(t, err)
			assert.Equal(t, proto.AccountStatus_ACTIVE, account.Status)
		})

		t.Run("fails when the address does not match with auth account", func(t *testing.T) {
			result, err := apitest.Client().RequestAccountDeletion(apitest.AccountContextFromAddress(proto.HashFromString(sequenceWallet.Address().String())), &proto.WalletProof{
				Address:   "wrong address",
				Message:   "message",
				Signature: "signature",
			})
			assert.ErrorContains(t, err, "address is invalid")
			assert.False(t, result)

			account, err := data.DB.Accounts(nil).FindByAddress(proto.HashFromString(sequenceWallet.Address().String()))
			assert.NoError(t, err)
			assert.Equal(t, proto.AccountStatus_ACTIVE, account.Status)
		})

		t.Run("sets status for deletion and schedule a task when the signature is correct", func(t *testing.T) {
			msg := rpc.RequestAccountDeletionMessage
			sig, err := sequenceWallet.SignMessage([]byte(rpc.PrefixEIP191Message(msg)))
			require.NoError(t, err)

			result, err := apitest.Client().RequestAccountDeletion(apitest.AccountContextFromAddress(proto.HashFromString(sequenceWallet.Address().String())), &proto.WalletProof{
				Address:   sequenceWallet.Address().String(),
				Message:   msg,
				Signature: hexutil.Encode(sig),
			})
			assert.NoError(t, err)
			assert.True(t, result)

			account, err := data.DB.Accounts(nil).FindByAddress(proto.HashFromString(sequenceWallet.Address().String()))
			assert.NoError(t, err)
			assert.Equal(t, proto.AccountStatus_TO_DELETE, account.Status)

			task, taskPayload := getAccountDeletionTask(t, account.ID)
			assert.Equal(t, proto.TaskStatus_PENDING, task.Status)
			assert.WithinDuration(t, time.Now().Add(30*24*time.Hour).Add(-time.Hour), *task.RunAt, time.Minute)
			assert.Equal(t, account.ID, taskPayload.AccountID)
		})
	})
}

func TestRegisterAccount(t *testing.T) {
	var accountRegisterer *rpcmock.MockAccountRegisterer

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			accountRegisterer = rpcmock.NewMockAccountRegisterer(ctrl)

			apiService := apitest.APIService()

			originalAccountRegisterer := apiService.RPC.AccountRegisterer

			apiService.RPC.AccountRegisterer = accountRegisterer

			t.Cleanup(func() {
				apiService.RPC.AccountRegisterer = originalAccountRegisterer
			})
		}
	}

	t.Run("registers", func(t *testing.T) {
		walletAuthProof, wallet, err := apitest.EthAuthWalletProof("")
		require.NoError(t, err)

		_, jwtToken, _, _, err := apitest.Client().GetAuthToken(context.Background(), walletAuthProof)
		require.NoError(t, err)

		username := "TestRegisterAccount-1"
		accountToBeRegistered := &proto.AccountRegistration{
			Name: &username,
		}

		accountRegisterer.EXPECT().Register(gomock.Any(), gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ any, _ any, req *proto.AccountRegistration) (*data.Account, error) {
				assert.Equal(t, proto.HashFromString(wallet.Address().String()), req.Address)
				assert.Equal(t, username, *req.Name)

				account := &data.Account{Account: &proto.Account{
					Address: req.Address,
					Name:    *req.Name,
				}}

				err := data.DB.Save(account)
				require.NoError(t, err)

				return account, nil
			})

		status, account, err := apitest.Client().RegisterAccount(apitest.AuthHeaderContext(jwtToken), accountToBeRegistered, "")
		require.NoError(t, err)
		assert.True(t, status)
		require.NotNil(t, account)
		assert.Equal(t, proto.HashFromString(wallet.Address().String()), account.Address)
		assert.Equal(t, username, account.Name)
	})
}

func getAccountDeletionTask(t *testing.T, accountID proto.AccountID) (*data.Task, *jobqueue.AccountDeletionTask) {
	tasks := data.DB.Tasks(nil).Find(db.Cond{"account_id": accountID, "queue": jobqueue.AccountDeletionQueue})

	var task data.Task
	err := tasks.One(&task)
	require.NoError(t, err)

	var payload jobqueue.AccountDeletionTask
	err = json.Unmarshal(task.Payload, &payload)
	require.NoError(t, err)

	return &task, &payload
}

func TestAccountStats(t *testing.T) {
	accountID, address, err := apitest.CreateRandomAccount("TestAccountStats")
	require.NoError(t, err)

	season1 := uint16(1)
	season2 := uint16(2)
	season3 := uint16(3)

	// Setup
	{
		_, err := data.DB.AccountStats(nil).Insert(data.AccountStat{AccountStat: &proto.AccountStat{
			AccountID: accountID,
			GameMode:  proto.GameMode_RANKED_CONSTRUCTED,
			Season:    &season1,
		}})
		require.NoError(t, err)

		_, err = data.DB.AccountStats(nil).Insert(data.AccountStat{AccountStat: &proto.AccountStat{
			AccountID: accountID,
			GameMode:  proto.GameMode_RANKED_DISCOVERY,
			Season:    &season2,
		}})
		require.NoError(t, err)

		_, err = data.DB.AccountStats(nil).Insert(data.AccountStat{AccountStat: &proto.AccountStat{
			AccountID: accountID,
			GameMode:  proto.GameMode_RANKED_CONSTRUCTED,
			Season:    &season3,
		}})
		require.NoError(t, err)

		t.Cleanup(func() {
			result := data.DB.AccountStats(nil).Find(db.Cond{"account_id": accountID})

			err := result.Delete()
			require.NoError(t, err)
		})
	}

	t.Run("returns stats for all seasons", func(t *testing.T) {
		constructedStats, discoveryStats, err := apitest.Client().GetAccountStats(apitest.AccountContext(accountID), address.String(), nil)
		require.NoError(t, err)

		require.Len(t, constructedStats, int(data.CurrentSeason()))
		assert.Equal(t, season1, *constructedStats[0].Season)
		assert.Equal(t, season2, *constructedStats[1].Season)
		assert.Equal(t, season3, *constructedStats[2].Season)

		require.Len(t, discoveryStats, int(data.CurrentSeason()))
		assert.Equal(t, season1, *discoveryStats[0].Season)
		assert.Equal(t, season2, *discoveryStats[1].Season)
		assert.Equal(t, season3, *discoveryStats[2].Season)
	})

	t.Run("returns stats for requested seasons", func(t *testing.T) {
		constructedStats, discoveryStats, err := apitest.Client().GetAccountStats(apitest.AccountContext(accountID), address.String(), []uint16{season1, season3})
		require.NoError(t, err)

		require.Len(t, constructedStats, 2)
		assert.Equal(t, season1, *constructedStats[0].Season)
		assert.Equal(t, season3, *constructedStats[1].Season)

		require.Len(t, discoveryStats, 2)
	})
}

func TestAccountInvitedBy(t *testing.T) {
	oldWeaverAuthProof, _, err := apitest.EthAuthWalletProof("gesture amazing swallow crumble boy salute beauty glimpse spoon wonder betray can scrub mandate afraid")
	assert.NoError(t, err)
	assert.NotEmpty(t, oldWeaverAuthProof)

	_, oldWeaverToken, _, _, err := apitest.Client().GetAuthToken(context.Background(), oldWeaverAuthProof)
	assert.NoError(t, err)
	assert.NotEmpty(t, oldWeaverToken)

	username := "old-weaver-01"

	accountToBeRegistered := &proto.AccountRegistration{
		Name:             &username,
		DeviceProperties: proto.DeviceProperties{},
	}

	_, oldWeaver, err := apitest.Client().RegisterAccount(apitest.AuthHeaderContext(oldWeaverToken), accountToBeRegistered, "")
	assert.NoError(t, err)
	assert.NotNil(t, oldWeaver)
	assert.Nil(t, oldWeaver.InvitedBy)

	inviterAuthProof, _, err := apitest.EthAuthWalletProof("fat push trophy seven bleak assault wheat fan work tenant annual loyal paddle best injury")
	assert.NoError(t, err)
	assert.NotEmpty(t, inviterAuthProof)

	_, inviterToken, _, _, err := apitest.Client().GetAuthToken(context.Background(), inviterAuthProof)
	assert.NoError(t, err)
	assert.NotEmpty(t, inviterToken)

	weaverUsername := "weaver-01"

	inviterAddress := apitest.RandomAddress()
	inviterAccount := &proto.AccountRegistration{
		Name:             &weaverUsername,
		InvitedBy:        &inviterAddress,
		DeviceProperties: proto.DeviceProperties{},
	}
	_, inviter, err := apitest.Client().RegisterAccount(apitest.AuthHeaderContext(inviterToken), inviterAccount, "")
	assert.ErrorContains(t, err, "cannot find inviter")
	assert.Nil(t, inviter)

	weaverAccount := &proto.AccountRegistration{
		Name:             &weaverUsername,
		DeviceProperties: proto.DeviceProperties{},
	}
	_, inviter, err = apitest.Client().RegisterAccount(apitest.AuthHeaderContext(inviterToken), weaverAccount, "")
	assert.NoError(t, err)
	assert.NotNil(t, inviter)
	assert.Nil(t, inviter.InvitedBy)

	inviteeAuthProof, _, err := apitest.EthAuthWalletProof("bullet physical firm large call above slow nice solve jaguar soul knee intact special game")
	assert.NoError(t, err)
	assert.NotEmpty(t, inviteeAuthProof)

	_, inviteeToken, _, _, err := apitest.Client().GetAuthToken(context.Background(), inviteeAuthProof)
	assert.NoError(t, err)
	assert.NotEmpty(t, inviteeToken)

	inviteeUsername := "invitee-01"

	inviteeAccountToBeRegistered := &proto.AccountRegistration{
		Name:             &inviteeUsername,
		InvitedBy:        &inviter.Address,
		DeviceProperties: proto.DeviceProperties{},
	}

	_, invitee, err := apitest.Client().RegisterAccount(apitest.AuthHeaderContext(inviteeToken), inviteeAccountToBeRegistered, "")
	assert.NoError(t, err)
	assert.NotNil(t, invitee)
	assert.NotNil(t, invitee.InvitedBy)

	{
		account, err := apitest.Client().UpdateAccount(apitest.AuthHeaderContext(inviterToken), &proto.Account{
			Name:    "weaver-01",
			Address: inviter.Address,
		})
		assert.NoError(t, err)
		assert.Nil(t, account.InvitedBy, "no one invited this person")
	}

	{
		account, err := apitest.Client().UpdateAccount(apitest.AuthHeaderContext(inviteeToken), &proto.Account{
			Name:    "invitee-02",
			Address: invitee.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, account.InvitedBy)
		assert.Equal(t, inviter.Address, *account.InvitedBy, "edit should not overwrite the original inviter")
	}

	{
		_, newInviterAddress, err := apitest.CreateRandomAccount("TestAccountInvitedBy-inviter-2")
		require.NoError(t, err)

		account, err := apitest.Client().UpdateAccount(apitest.AuthHeaderContext(inviteeToken), &proto.Account{
			Name:      "invitee-03",
			Address:   invitee.Address,
			InvitedBy: &newInviterAddress,
		})
		assert.NoError(t, err)
		assert.NotNil(t, account.InvitedBy)
		assert.Equal(t, inviter.Address, *account.InvitedBy, "edit should not overwrite the original inviter")
	}

	{
		account, err := apitest.Client().UpdateAccount(apitest.AuthHeaderContext(oldWeaverToken), &proto.Account{
			Name:      "old-weaver-03",
			Address:   oldWeaver.Address,
			InvitedBy: &inviter.Address,
		})
		assert.NoError(t, err)
		assert.NotNil(t, account.InvitedBy)
		assert.Equal(t, inviter.Address, *account.InvitedBy, "should have set the inviter")
	}
}

func TestCantGiveSelfAdmin(t *testing.T) {
	var accountID proto.AccountID

	var address proto.Hash

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, address, err = apitest.CreateRandomAccount("TestCantGiveSelfAdmin")
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(accountID)

	account, err := apitest.Client().UpdateAccount(ctx, &proto.Account{
		Address: address,
		Admin:   true,
		Name:    "adminman",
	})
	require.NoError(t, err)
	assert.False(t, account.Admin) // can't give myself admin
	assert.Equal(t, "adminman", account.Name)
}

func TestPrefixEIP191Message(t *testing.T) {
	t.Run("prefixes the message following the standard EIP-191", func(t *testing.T) {
		result := rpc.PrefixEIP191Message("abc")

		assert.Equal(t, "\x19Ethereum Signed Message:\n3abc", result)
	})
}

func TestMigrateFromBurner(t *testing.T) {
	t.Run("successful", func(t *testing.T) {
		var accountID proto.AccountID

		var walletAuthProof string

		var wallet *ethwallet.Wallet

		var item *data.Item

		// Setup
		{
			// Accounts
			{
				address := apitest.RandomAddress()
				account := &data.Account{Account: &proto.Account{
					Address: address,
					Name:    "TestMigrateFromBurner-1",
					PrivateSettings: &proto.AccountSettingsWrapper{
						AccountSettings: proto.AccountSettings{
							BurnerAddress: &address,
						},
					},
				}}

				assert.True(t, account.IsBurner())

				err := apitest.CreateAccount(account)
				require.NoError(t, err)

				accountID = account.ID
			}

			// Eth wallet
			{
				var err error
				walletAuthProof, wallet, err = apitest.EthAuthWalletProof("")
				require.NoError(t, err)
			}

			// Items
			{
				// Set items balance from chain
				{
					contractAddress := apitest.RandomAddress()
					addressHash := proto.HashFromString(wallet.Address().String())
					item = &data.Item{Item: &proto.Item{
						AccountAddress:  &addressHash,
						ContractAddress: &contractAddress,
						ItemType:        proto.ItemType_SW_SILVER_CARDS,
						TokenID:         1,
						Balance:         prototyp.NewBigInt(1),
					}}
					err := data.DB.Save(item)
					require.NoError(t, err)
				}
			}
		}

		ctx := apitest.AccountContext(accountID)

		status, err := apitest.Client().MigrateFromBurner(ctx, walletAuthProof)
		require.NoError(t, err)
		assert.True(t, status)

		account, err := data.DB.Accounts().FindByID(accountID)
		require.NoError(t, err)
		assert.False(t, account.IsBurner())
		assert.Equal(t, strings.ToLower(wallet.Address().String()), account.Address.String())

		// Items from chain are assigned to an account
		storedItem, err := data.DB.Items().FindOne(db.Cond{"id": item.ID})
		require.NoError(t, err)
		assert.Equal(t, accountID, storedItem.AccountID)
	})

	t.Run("fails when proof is invalid", func(t *testing.T) {
		var accountID proto.AccountID

		// Setup
		{
			// Accounts
			{
				address := apitest.RandomAddress()
				account := &data.Account{Account: &proto.Account{
					Address: address,
					Name:    "TestMigrateFromBurner-2",
					PrivateSettings: &proto.AccountSettingsWrapper{
						AccountSettings: proto.AccountSettings{
							BurnerAddress: &address,
						},
					},
				}}

				assert.True(t, account.IsBurner())

				err := apitest.CreateAccount(account)
				require.NoError(t, err)

				accountID = account.ID
			}
		}

		ctx := apitest.AccountContext(accountID)

		status, err := apitest.Client().MigrateFromBurner(ctx, "bad-proof")
		require.ErrorContains(t, err, "invalid proof string")
		assert.False(t, status)
	})

	t.Run("fails when address is registered already", func(t *testing.T) {
		var accountID proto.AccountID

		var walletAuthProof string

		var wallet *ethwallet.Wallet

		// Setup
		{
			// Accounts
			{
				address := apitest.RandomAddress()
				account := &data.Account{Account: &proto.Account{
					Address: address,
					Name:    "TestMigrateFromBurner-3",
					PrivateSettings: &proto.AccountSettingsWrapper{
						AccountSettings: proto.AccountSettings{
							BurnerAddress: &address,
						},
					},
				}}

				assert.True(t, account.IsBurner())

				err := apitest.CreateAccount(account)
				require.NoError(t, err)

				accountID = account.ID
			}

			// Eth wallet
			{
				var err error
				walletAuthProof, wallet, err = apitest.EthAuthWalletProof("")
				require.NoError(t, err)

				account := &data.Account{Account: &proto.Account{
					Address: proto.HashFromString(wallet.Address().String()),
					Name:    "TestMigrateFromBurner-3-0",
				}}

				err = apitest.CreateAccount(account)
				require.NoError(t, err)
			}
		}

		ctx := apitest.AccountContext(accountID)

		status, err := apitest.Client().MigrateFromBurner(ctx, walletAuthProof)
		require.ErrorContains(t, err, "account is registered already")
		assert.False(t, status)
	})

	t.Run("fails when account is not burner", func(t *testing.T) {
		var accountID proto.AccountID

		var walletAuthProof string

		// Setup
		{
			// Accounts
			{
				address := apitest.RandomAddress()
				account := &data.Account{Account: &proto.Account{
					Address: address,
					Name:    "TestMigrateFromBurner-4",
				}}

				assert.False(t, account.IsBurner())

				err := apitest.CreateAccount(account)
				require.NoError(t, err)

				accountID = account.ID
			}

			// Eth wallet
			{
				var err error
				walletAuthProof, _, err = apitest.EthAuthWalletProof("")
				require.NoError(t, err)
			}
		}

		ctx := apitest.AccountContext(accountID)

		status, err := apitest.Client().MigrateFromBurner(ctx, walletAuthProof)
		require.ErrorContains(t, err, "account is not burner")
		assert.False(t, status)
	})
}

func TestPrepareTransferAssetsFromBurnerTransaction(t *testing.T) {
	var accountAssetTransferer *rpcmock.MockAccountAssetTransferer

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestPrepareTransferAssetsFromBurnerTransaction")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			accountAssetTransferer = rpcmock.NewMockAccountAssetTransferer(ctrl)

			apiService := apitest.APIService()

			originalAccountAssetTransferer := apiService.RPC.AccountAssetTransferer

			apiService.RPC.AccountAssetTransferer = accountAssetTransferer

			t.Cleanup(func() {
				apiService.RPC.AccountAssetTransferer = originalAccountAssetTransferer
			})
		}
	}

	expectedTransactions := []*proto.OnChainTransaction{
		{},
	}

	accountAssetTransferer.EXPECT().ComposeTransactionToTransferFromBurner(gomock.Any(), accountID).Return(expectedTransactions, nil)

	ctx := apitest.AccountContext(accountID)

	transactions, err := apitest.Client().PrepareTransferAssetsFromBurnerTransaction(ctx)
	require.NoError(t, err)
	require.NotEmpty(t, transactions)

	assert.Equal(t, expectedTransactions, transactions)
}
