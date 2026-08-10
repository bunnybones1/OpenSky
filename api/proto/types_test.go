package proto_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestAccountSettingsWrapper(t *testing.T) {
	t.Run("has valid Twitch profile", func(t *testing.T) {
		t.Run("is valid", func(t *testing.T) {
			profile := "ab_12"

			settings := proto.AccountSettingsWrapper{
				AccountSettings: proto.AccountSettings{
					TwitchProfile: &profile,
				},
			}

			assert.True(t, settings.HasValidTwitchProfile())
		})

		t.Run("is valid when it contains a full profile URL and gets username from it", func(t *testing.T) {
			profile := "https://www.twitch.tv/ab_12"

			settings := proto.AccountSettingsWrapper{
				AccountSettings: proto.AccountSettings{
					TwitchProfile: &profile,
				},
			}

			assert.True(t, settings.HasValidTwitchProfile())
			assert.Equal(t, "ab_12", *settings.TwitchProfile)
		})

		t.Run("is invalid when the length is less than 4", func(t *testing.T) {
			profile := "abc"

			settings := proto.AccountSettingsWrapper{
				AccountSettings: proto.AccountSettings{
					TwitchProfile: &profile,
				},
			}

			assert.False(t, settings.HasValidTwitchProfile())
		})

		t.Run("is invalid when the length is greater than 25", func(t *testing.T) {
			profile := "abcdefghih1234567890abcdef"

			settings := proto.AccountSettingsWrapper{
				AccountSettings: proto.AccountSettings{
					TwitchProfile: &profile,
				},
			}

			assert.False(t, settings.HasValidTwitchProfile())
		})

		t.Run("is invalid when does not contain only alphanumerical characters", func(t *testing.T) {
			profile := "ab 12"

			settings := proto.AccountSettingsWrapper{
				AccountSettings: proto.AccountSettings{
					TwitchProfile: &profile,
				},
			}

			assert.False(t, settings.HasValidTwitchProfile())
		})

		t.Run("is invalid when it starts with an underscore", func(t *testing.T) {
			profile := "_ab12"

			settings := proto.AccountSettingsWrapper{
				AccountSettings: proto.AccountSettings{
					TwitchProfile: &profile,
				},
			}

			assert.False(t, settings.HasValidTwitchProfile())
		})
	})
}

func TestMatch(t *testing.T) {
	t.Run("is ranked", func(t *testing.T) {
		t.Run("yes", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_RANKED_CONSTRUCTED,
				proto.GameMode_RANKED_DISCOVERY,
			}

			for _, mode := range modes {
				match := proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				}

				result := match.IsRanked()

				assert.True(t, result)
			}
		})

		t.Run("no", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_CONQUEST_CONSTRUCTED,
				proto.GameMode_CONQUEST_DISCOVERY,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
				proto.GameMode_CHALLENGE_DISCOVERY,
			}

			for _, mode := range modes {
				match := proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				}

				result := match.IsRanked()

				assert.False(t, result)
			}
		})
	})

	t.Run("is conquest", func(t *testing.T) {
		t.Run("yes", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_CONQUEST_CONSTRUCTED,
				proto.GameMode_CONQUEST_DISCOVERY,
			}

			for _, mode := range modes {
				match := proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				}

				result := match.IsConquest()

				assert.True(t, result)
			}
		})

		t.Run("no", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_RANKED_CONSTRUCTED,
				proto.GameMode_RANKED_DISCOVERY,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
				proto.GameMode_CHALLENGE_DISCOVERY,
			}

			for _, mode := range modes {
				match := proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				}

				result := match.IsConquest()

				assert.False(t, result)
			}
		})
	})

	t.Run("is challenge", func(t *testing.T) {
		t.Run("yes", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_CHALLENGE_CONSTRUCTED,
				proto.GameMode_CHALLENGE_DISCOVERY,
			}

			for _, mode := range modes {
				match := proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				}

				result := match.IsChallenge()

				assert.True(t, result)
			}
		})

		t.Run("no", func(t *testing.T) {
			modes := []proto.GameMode{
				proto.GameMode_RANKED_CONSTRUCTED,
				proto.GameMode_RANKED_DISCOVERY,
				proto.GameMode_CONQUEST_CONSTRUCTED,
				proto.GameMode_CONQUEST_DISCOVERY,
			}

			for _, mode := range modes {
				match := proto.Match{
					Player1GameMode: mode,
					Player2GameMode: mode,
				}

				result := match.IsChallenge()

				assert.False(t, result)
			}
		})
	})

	t.Run("has player", func(t *testing.T) {
		accountID2 := apitest.RandomAccountID()
		accountID3 := apitest.RandomAccountID()

		account := &proto.Account{
			ID: apitest.RandomAccountID(),
		}

		t.Run("yes when account is a player 1", func(t *testing.T) {
			match := proto.Match{
				Player1ID: account.ID,
				Player2ID: accountID2,
			}

			result := match.HasPlayer(account)

			assert.True(t, result)
		})

		t.Run("yes when account is a player 2", func(t *testing.T) {
			match := proto.Match{
				Player1ID: accountID2,
				Player2ID: account.ID,
			}

			result := match.HasPlayer(account)

			assert.True(t, result)
		})

		t.Run("no when account is nil", func(t *testing.T) {
			match := proto.Match{
				Player1ID: accountID2,
				Player2ID: accountID3,
			}

			result := match.HasPlayer(nil)

			assert.False(t, result)
		})

		t.Run("no when account is neither of players", func(t *testing.T) {
			match := proto.Match{
				Player1ID: accountID2,
				Player2ID: accountID3,
			}

			result := match.HasPlayer(account)

			assert.False(t, result)
		})
	})

	t.Run("has winner", func(t *testing.T) {
		t.Run("yes", func(t *testing.T) {
			one := uint(1)
			two := uint(2)

			for _, winning := range []*uint{&one, &two} {
				match := proto.Match{
					WinningPlayer: winning,
				}

				result := match.HasWinner()

				assert.True(t, result)
			}
		})

		t.Run("no", func(t *testing.T) {
			zero := uint(0)

			for _, winning := range []*uint{&zero, nil} {
				match := proto.Match{
					WinningPlayer: winning,
				}

				result := match.HasWinner()

				assert.False(t, result)
			}
		})
	})
}

func TestAccountID(t *testing.T) {
	accountID := proto.AccountID(10)

	t.Run("json encode and decode", func(t *testing.T) {
		b, err := json.Marshal(accountID)
		require.NoError(t, err)

		var i int
		err = json.Unmarshal(b, &i)
		require.NoError(t, err)
		assert.NotEqual(t, int(accountID), i)

		var result proto.AccountID
		err = json.Unmarshal(b, &result)
		require.NoError(t, err)
		assert.Equal(t, int(accountID), int(result))
	})
}

func TestAccount(t *testing.T) {
	t.Run("is burner", func(t *testing.T) {
		address1 := apitest.RandomAddress()
		address2 := apitest.RandomAddress()

		tests := []struct {
			desc           string
			address        proto.Hash
			burnerAddress  *proto.Hash
			expectedResult bool
		}{
			{
				desc:           "false when there is no burner record",
				address:        address1,
				expectedResult: false,
			},
			{
				desc:           "false when it is already migrated burner",
				address:        address1,
				burnerAddress:  &address2,
				expectedResult: false,
			},
			{
				desc:           "true when it is still burner",
				address:        address1,
				burnerAddress:  &address1,
				expectedResult: true,
			},
		}

		for _, tt := range tests {
			t.Run(tt.desc, func(t *testing.T) {
				account := proto.Account{
					Address: tt.address,
				}

				if tt.burnerAddress != nil {
					account.PrivateSettings = &proto.AccountSettingsWrapper{
						AccountSettings: proto.AccountSettings{
							BurnerAddress: tt.burnerAddress,
						},
					}
				}

				result := account.IsBurner()
				assert.Equal(t, tt.expectedResult, result)
			})
		}
	})

	t.Run("was burner", func(t *testing.T) {
		address1 := apitest.RandomAddress()
		address2 := apitest.RandomAddress()

		tests := []struct {
			desc           string
			address        proto.Hash
			burnerAddress  *proto.Hash
			expectedResult bool
		}{
			{
				desc:           "false when there is no burner record",
				address:        address1,
				expectedResult: false,
			},
			{
				desc:           "true when it is already migrated burner",
				address:        address1,
				burnerAddress:  &address2,
				expectedResult: true,
			},
			{
				desc:           "false when it is still burner",
				address:        address1,
				burnerAddress:  &address1,
				expectedResult: false,
			},
		}

		for _, tt := range tests {
			t.Run(tt.desc, func(t *testing.T) {
				account := proto.Account{
					Address: tt.address,
				}

				if tt.burnerAddress != nil {
					account.PrivateSettings = &proto.AccountSettingsWrapper{
						AccountSettings: proto.AccountSettings{
							BurnerAddress: tt.burnerAddress,
						},
					}
				}

				result := account.WasBurner()
				assert.Equal(t, tt.expectedResult, result)
			})
		}
	})
}
