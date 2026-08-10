//go:build integration

package xp_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/levels/xp"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestAwarder(t *testing.T) {
	var account1WithHeroes, account2WithHeroes, account3WithoutHeroes, account4HighLevel *data.Account

	// Setup
	{
		// Accounts
		{
			var err error

			accountID1, _, err := apitest.CreateRandomAccount("TestAwarder-1")
			require.NoError(t, err)

			accountID2, _, err := apitest.CreateRandomAccount("TestAwarder-2")
			require.NoError(t, err)

			accountID3, _, err := apitest.CreateRandomAccount("TestAwarder-3")
			require.NoError(t, err)

			accountID4, _, err := apitest.CreateRandomAccount("TestAwarder-4")
			require.NoError(t, err)

			account1WithHeroes, err = data.DB.Accounts().FindByID(accountID1)
			require.NoError(t, err)

			account2WithHeroes, err = data.DB.Accounts().FindByID(accountID2)
			require.NoError(t, err)

			account3WithoutHeroes, err = data.DB.Accounts().FindByID(accountID3)
			require.NoError(t, err)

			account4HighLevel, err = data.DB.Accounts().FindByID(accountID4)
			require.NoError(t, err)
		}

		// Heroes
		{
			heroes := []proto.Hero{proto.Hero_ADA, proto.Hero_SAMYA, proto.Hero_FOX}

			for _, hero := range heroes {
				err := data.UnlockHero(data.DB, account1WithHeroes.ID, hero)
				require.NoError(t, err)

				err = data.UnlockHero(data.DB, account2WithHeroes.ID, hero)
				require.NoError(t, err)

				err = data.UnlockHero(data.DB, account4HighLevel.ID, hero)
				require.NoError(t, err)
			}
		}

		// Level up
		{
			account4HighLevel.Level = 35
			err := data.DB.Save(account4HighLevel)
			require.NoError(t, err)
		}
	}

	cfg := config.OpenSkyConfig{
		ExpMultiplier: 1,
	}

	awarder := xp.NewAwarder(cfg)

	t.Run("award from match", func(t *testing.T) {
		t.Run("does nothing when match is nil", func(t *testing.T) {
			rewards, err := awarder.AwardFromMatch(data.DB, nil, account1WithHeroes, account2WithHeroes)
			require.NoError(t, err)
			assert.Empty(t, rewards)
		})

		t.Run("awards tutorial XP", func(t *testing.T) {
			tutorialLevel := proto.TutorialLevel_LEVEL_1
			winningPlayer := uint(1)
			match := &data.Match{Match: &proto.Match{
				Status:          proto.MatchStatus_COMPLETED,
				Player1GameMode: proto.GameMode_TUTORIAL,
				Player1ID:       account3WithoutHeroes.ID,
				TutorialLevel:   &tutorialLevel,
				WinningPlayer:   &winningPlayer,
			}}

			t.Run("awards XP when completed the 1st time", func(t *testing.T) {
				rewards, err := awarder.AwardFromMatch(data.DB, match, account3WithoutHeroes, nil)
				require.NoError(t, err)
				require.NotEmpty(t, rewards)

				checkXPReward(t, rewards, account3WithoutHeroes.ID, proto.RewardExpReason_TutorialCompleted, 1)
			})

			t.Run("does not award XP when completed more times", func(t *testing.T) {
				rewards, err := awarder.AwardFromMatch(data.DB, match, account3WithoutHeroes, nil)
				require.NoError(t, err)
				require.Empty(t, rewards)
			})

			t.Run("does nothing when tutorial level is not set", func(t *testing.T) {
				match := &data.Match{Match: &proto.Match{
					Status:          proto.MatchStatus_COMPLETED,
					Player1GameMode: proto.GameMode_TUTORIAL,
					Player1ID:       account3WithoutHeroes.ID,
					WinningPlayer:   &winningPlayer,
				}}

				rewards, err := awarder.AwardFromMatch(data.DB, match, account3WithoutHeroes, nil)
				require.NoError(t, err)
				require.Empty(t, rewards)
			})

			t.Run("does nothing when tutorial level is unknown", func(t *testing.T) {
				tutorialLevel := proto.TutorialLevel_UNKNOWN
				match := &data.Match{Match: &proto.Match{
					Status:          proto.MatchStatus_COMPLETED,
					Player1GameMode: proto.GameMode_TUTORIAL,
					Player1ID:       account3WithoutHeroes.ID,
					TutorialLevel:   &tutorialLevel,
					WinningPlayer:   &winningPlayer,
				}}

				rewards, err := awarder.AwardFromMatch(data.DB, match, account3WithoutHeroes, nil)
				require.NoError(t, err)
				require.Empty(t, rewards)
			})

			t.Run("does nothing when player is not a winner", func(t *testing.T) {
				tutorialLevel := proto.TutorialLevel_LEVEL_2
				winningPlayer := uint(0)
				match := &data.Match{Match: &proto.Match{
					Status:          proto.MatchStatus_COMPLETED,
					Player1GameMode: proto.GameMode_TUTORIAL,
					Player1ID:       account3WithoutHeroes.ID,
					TutorialLevel:   &tutorialLevel,
					WinningPlayer:   &winningPlayer,
				}}

				rewards, err := awarder.AwardFromMatch(data.DB, match, account3WithoutHeroes, nil)
				require.NoError(t, err)
				require.Empty(t, rewards)
			})
		})

		t.Run("match XP", func(t *testing.T) {
			tests := map[proto.RewardExpReason][]struct {
				desc           string
				status         proto.MatchStatus
				gameMode       proto.GameMode
				turns          uint32
				player1        *data.Account
				player2        *data.Account
				winner         uint
				player1Rewards int
				player2Rewards int
			}{
				proto.RewardExpReason_MatchPlayed: {
					{
						desc:           "winner gets reward when has at least 3 heroes and loser does not get reward when he has less than 3 heroes",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_RANKED_CONSTRUCTED,
						player1:        account1WithHeroes,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 1,
						player2Rewards: 0,
					},
					{
						desc:           "loser gets reward when has at least 3 heroes and winner does not get reward when he has less than 3 heroes",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_RANKED_CONSTRUCTED,
						player1:        account1WithHeroes,
						player2:        account3WithoutHeroes,
						winner:         2,
						player1Rewards: 1,
						player2Rewards: 0,
					},
					{
						desc:           "player does not get reward when it is practice PVP and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_PRACTICE_PVP,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "player does not get reward when it is practice bot and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_PRACTICE_BOT,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "player does not get reward when it is warm up and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_WARM_UP,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "player does not get reward when it is challenge and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_CHALLENGE_CONSTRUCTED,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "loser gets reward when it is forfeited and at least 6 turns",
						status:         proto.MatchStatus_FORFEITED,
						gameMode:       proto.GameMode_RANKED_CONSTRUCTED,
						turns:          6,
						player1:        account1WithHeroes,
						player2:        account3WithoutHeroes,
						winner:         2,
						player1Rewards: 1,
						player2Rewards: 0,
					},
					{
						desc:           "loser does not get reward when it is forfeited and less than 6 turns",
						status:         proto.MatchStatus_FORFEITED,
						gameMode:       proto.GameMode_RANKED_CONSTRUCTED,
						turns:          5,
						player1:        account1WithHeroes,
						player2:        account3WithoutHeroes,
						winner:         2,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "loser gets reward when it is abandoned and at least 6 turns",
						status:         proto.MatchStatus_ABANDONED,
						gameMode:       proto.GameMode_RANKED_CONSTRUCTED,
						turns:          6,
						player1:        account1WithHeroes,
						player2:        account3WithoutHeroes,
						winner:         2,
						player1Rewards: 1,
						player2Rewards: 0,
					},
					{
						desc:           "loser does not get reward when it is abandoned and less than 6 turns",
						status:         proto.MatchStatus_ABANDONED,
						gameMode:       proto.GameMode_RANKED_CONSTRUCTED,
						turns:          5,
						player1:        account1WithHeroes,
						player2:        account3WithoutHeroes,
						winner:         2,
						player1Rewards: 0,
						player2Rewards: 0,
					},
				},
				proto.RewardExpReason_Draw: {
					{
						desc:           "only player with at least 3 heroes gets reward when it is draw",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_RANKED_CONSTRUCTED,
						player1:        account1WithHeroes,
						player2:        account3WithoutHeroes,
						winner:         0,
						player1Rewards: 1,
						player2Rewards: 0,
					},
					{
						desc:           "player does not get reward when it is practice PVP and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_PRACTICE_PVP,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         0,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "player does not get reward when it is practice bot and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_PRACTICE_BOT,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         0,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "player does not get reward when it is warm up and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_WARM_UP,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         0,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "player does not get reward when it is challenge and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_CHALLENGE_CONSTRUCTED,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         0,
						player1Rewards: 0,
						player2Rewards: 0,
					},
				},
				proto.RewardExpReason_Victory: {
					{
						desc:           "winner gets reward when has at least 3 heroes",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_RANKED_CONSTRUCTED,
						player1:        account1WithHeroes,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 1,
						player2Rewards: 0,
					},
					{
						desc:           "winner does not get reward when has less than 3 heroes",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_RANKED_CONSTRUCTED,
						player1:        account1WithHeroes,
						player2:        account3WithoutHeroes,
						winner:         2,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "winner does not get reward when it is practice PVP and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_PRACTICE_PVP,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "winner does not get reward when it is practice bot and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_PRACTICE_BOT,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "winner does not get reward when it is warm up and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_WARM_UP,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 0,
						player2Rewards: 0,
					},
					{
						desc:           "winner does not get reward when it is challenge and account level is above 34",
						status:         proto.MatchStatus_COMPLETED,
						gameMode:       proto.GameMode_CHALLENGE_CONSTRUCTED,
						player1:        account4HighLevel,
						player2:        account3WithoutHeroes,
						winner:         1,
						player1Rewards: 0,
						player2Rewards: 0,
					},
				},
			}

			for reason, subtests := range tests {
				t.Run(fmt.Sprintf("awards %s XP", reason), func(t *testing.T) {
					for _, tt := range subtests {
						t.Run(tt.desc, func(t *testing.T) {
							match := &data.Match{Match: &proto.Match{
								Status:          tt.status,
								Player1GameMode: tt.gameMode,
								Player2GameMode: tt.gameMode,
								Player1ID:       tt.player1.ID,
								Player2ID:       tt.player2.ID,
								WinningPlayer:   &tt.winner,
								TurnNonce:       tt.turns,
							}}

							rewards, err := awarder.AwardFromMatch(data.DB, match, tt.player1, tt.player2)
							require.NoError(t, err)

							checkXPReward(t, rewards, tt.player1.ID, reason, tt.player1Rewards)
							checkXPReward(t, rewards, tt.player2.ID, reason, tt.player2Rewards)
						})
					}
				})
			}
		})
	})
}

func checkXPReward(t *testing.T, rewards []*proto.Reward, accountID proto.AccountID, reason proto.RewardExpReason, count int) {
	var counter int

	for _, reward := range rewards {
		if reward.AccountID != accountID {
			continue
		}

		if reward.Type != proto.RewardType_EXP {
			continue
		}

		require.NotNil(t, reward.Exp)

		if reward.Exp.Reason != reason {
			continue
		}

		var expectedAmount int

		switch reward.Exp.Reason {
		case proto.RewardExpReason_TutorialCompleted:
			expectedAmount = 0
		case proto.RewardExpReason_MatchPlayed:
			expectedAmount = 30
		case proto.RewardExpReason_Draw:
			expectedAmount = 20
		case proto.RewardExpReason_Victory:
			expectedAmount = 20
		default:
			t.Errorf("unsupported reason %s", reward.Exp.Reason)
		}

		assert.Equal(t, expectedAmount, int(reward.Exp.Amount))

		counter++
	}

	assert.Equal(t, count, counter, "count of match victory rewards")
}
