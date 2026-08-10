//go:build integration

package accounts_test

import (
	"context"
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/accounts"
	"github.com/horizon-games/OpenSky/api/lib/accounts/mock"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestRegisterer(t *testing.T) {
	var nameGenerator *mock.MockNameGenerator

	var analyticsTracker *analyticsMock.MockTracker

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			nameGenerator = mock.NewMockNameGenerator(ctrl)
			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
		}
	}

	var accountID proto.AccountID
	locale := "en_CA"
	countryCode := "CA"
	deviceProperties := proto.DeviceProperties{
		CountryCode: &countryCode,
	}

	cfg := &config.Config{}

	ctx := context.Background()

	registerer := accounts.NewRegisterer(cfg, zerolog.Nop(), nameGenerator, analyticsTracker)

	t.Run("when standard wallet is used", func(t *testing.T) {
		t.Run("registers", func(t *testing.T) {
			address := apitest.RandomAddress()
			name := "TestRegisterer-1"

			req := &proto.AccountRegistration{
				Address:          address,
				Name:             &name,
				Locale:           locale,
				DeviceProperties: deviceProperties,
			}

			waitCtx, cancelFn := context.WithTimeout(ctx, time.Hour)

			analyticsTracker.EXPECT().TrackAccountCreated(gomock.Any(), gomock.AssignableToTypeOf(accountID), &deviceProperties).Do(func(_, _, _ any) error {
				cancelFn()

				return nil
			})

			account, err := registerer.Register(ctx, data.DB.Session, req)
			require.NoError(t, err)
			require.NotNil(t, account)

			assert.Equal(t, address, account.Address)
			assert.Equal(t, name, account.Name)
			assert.False(t, account.IsBurner())
			assert.Equal(t, locale, account.Locale)

			<-waitCtx.Done()
		})

		t.Run("registers and uses provided name", func(t *testing.T) {
			address := apitest.RandomAddress()
			name := "TestRegisterer-2"

			req := &proto.AccountRegistration{
				Address:          address,
				Name:             &name,
				Locale:           locale,
				DeviceProperties: deviceProperties,
			}

			waitCtx, cancelFn := context.WithTimeout(ctx, time.Hour)

			analyticsTracker.EXPECT().TrackAccountCreated(gomock.Any(), gomock.AssignableToTypeOf(accountID), &deviceProperties).Do(func(_, _, _ any) error {
				cancelFn()

				return nil
			})

			account, err := registerer.Register(ctx, data.DB.Session, req)
			require.NoError(t, err)
			require.NotNil(t, account)

			assert.Equal(t, address, account.Address)
			assert.Equal(t, name, account.Name)
			assert.False(t, account.IsBurner())
			assert.Equal(t, locale, account.Locale)

			<-waitCtx.Done()
		})
	})

	t.Run("when burner wallet is used", func(t *testing.T) {
		t.Run("registers and generates name when the name is not provided", func(t *testing.T) {
			address := apitest.RandomAddress()
			name := "TestRegisterer-3"

			req := &proto.AccountRegistration{
				Address:          address,
				IsBurnerWallet:   data.SetBoolPointer(true),
				Locale:           locale,
				DeviceProperties: deviceProperties,
			}

			nameGenerator.EXPECT().GenerateFromAddress(gomock.Any(), address).Return(name, nil)

			waitCtx, cancelFn := context.WithTimeout(ctx, time.Hour)

			analyticsTracker.EXPECT().TrackAccountCreated(gomock.Any(), gomock.AssignableToTypeOf(accountID), &deviceProperties).Do(func(_, _, _ any) error {
				cancelFn()

				return nil
			})

			account, err := registerer.Register(ctx, data.DB.Session, req)
			require.NoError(t, err)
			require.NotNil(t, account)

			assert.Equal(t, address, account.Address)
			assert.Equal(t, name, account.Name)
			assert.True(t, account.IsBurner())
			assert.Equal(t, locale, account.Locale)

			<-waitCtx.Done()
		})

		t.Run("registers and uses provided name", func(t *testing.T) {
			address := apitest.RandomAddress()
			name := "TestRegisterer-4"

			req := &proto.AccountRegistration{
				Address:          address,
				Name:             &name,
				IsBurnerWallet:   data.SetBoolPointer(true),
				Locale:           locale,
				DeviceProperties: deviceProperties,
			}

			waitCtx, cancelFn := context.WithTimeout(ctx, time.Hour)

			analyticsTracker.EXPECT().TrackAccountCreated(gomock.Any(), gomock.AssignableToTypeOf(accountID), &deviceProperties).Do(func(_, _, _ any) error {
				cancelFn()

				return nil
			})

			account, err := registerer.Register(ctx, data.DB.Session, req)
			require.NoError(t, err)
			require.NotNil(t, account)

			assert.Equal(t, address, account.Address)
			assert.Equal(t, name, account.Name)
			assert.True(t, account.IsBurner())
			assert.Equal(t, locale, account.Locale)

			<-waitCtx.Done()
		})
	})
}
