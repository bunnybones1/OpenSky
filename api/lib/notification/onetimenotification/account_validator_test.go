package onetimenotification_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/notification/onetimenotification"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestAccountValidator(t *testing.T) {
	validator := onetimenotification.NewAccountValidator()

	address := apitest.RandomAddress()

	t.Run("validates", func(t *testing.T) {
		t.Run("age", func(t *testing.T) {
			createdAt := data.TimeNowUTC().Add(-time.Hour * 2)

			rules := []byte(`{"age": [{">": "1h"}]}`)

			account := &data.Account{
				Account: &proto.Account{
					Address:   address,
					CreatedAt: &createdAt,
				},
			}

			isValid, err := validator.IsValid(rules, account)
			require.NoError(t, err)
			assert.True(t, isValid)
		})

		t.Run("address", func(t *testing.T) {
			createdAt := data.TimeNowUTC().Add(-time.Hour * 2)

			rules := []byte(fmt.Sprintf(`{"address": [{"==": "%s"}]}`, address))

			account := &data.Account{
				Account: &proto.Account{
					Address:   address,
					CreatedAt: &createdAt,
				},
			}

			isValid, err := validator.IsValid(rules, account)
			require.NoError(t, err)
			assert.True(t, isValid)
		})

		t.Run("created at", func(t *testing.T) {
			createdAt := time.Date(2023, 1, 4, 0, 0, 0, 0, time.UTC)

			rules := []byte(`{"created_at": [{"<": "2023-01-05"}]}`)

			account := &data.Account{
				Account: &proto.Account{
					Address:   address,
					CreatedAt: &createdAt,
				},
			}

			isValid, err := validator.IsValid(rules, account)
			require.NoError(t, err)
			assert.True(t, isValid)
		})
	})
}
