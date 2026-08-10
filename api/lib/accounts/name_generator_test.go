//go:build integration

package accounts_test

import (
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/accounts"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestNameGenerator(t *testing.T) {
	t.Run("generate from address", func(t *testing.T) {
		var accountIDs []proto.AccountID

		// Setup
		{
			t.Cleanup(func() {
				err := data.DB.Accounts().Find(db.Cond{"id": db.AnyOf(accountIDs)}).Delete()
				require.NoError(t, err)
			})
		}

		tests := []struct {
			name           string
			address        proto.Hash
			expectedResult string
			errorContains  string
		}{
			{
				name:           "name contains initial 5 chars of the address when same name does not exist",
				address:        proto.HashFromString("0x1234567890000000000000000000000000000001"),
				expectedResult: "OpenSky_12345",
			},
			{
				name:           "name contains 1 more char of the address when name same as initial 5 chars exists",
				address:        proto.HashFromString("0x1234567890000000000000000000000000000001"),
				expectedResult: "OpenSky_123456",
			},
			{
				name:           "name contains 2 more chars of the address when name same as first 6 chars exists",
				address:        proto.HashFromString("0x1234567890000000000000000000000000000001"),
				expectedResult: "OpenSky_1234567",
			},
			{
				name:          "fails when address is invalid",
				address:       proto.HashFromString("0x123456789"),
				errorContains: "addres is not valid",
			},
		}

		generator := accounts.NewNameGenerator(zerolog.Nop())

		for i := 0; i < len(tests); i++ {
			tt := tests[i]

			t.Run(tt.name, func(t *testing.T) {
				name, err := generator.GenerateFromAddress(data.DB.Session, tt.address)

				if len(tt.errorContains) == 0 {
					require.NoError(t, err)
				} else {
					require.ErrorContains(t, err, tt.errorContains)
					return
				}

				accountID, _, err := apitest.CreateRandomAccount(name)
				require.NoError(t, err)

				accountIDs = append(accountIDs, accountID)
			})
		}
	})
}
