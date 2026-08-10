//go:build integration

package skypass_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/skypass"
	"github.com/horizon-games/OpenSky/api/lib/skypass/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestClaimer(t *testing.T) {
	t.Run("claim rewards", func(t *testing.T) {
		adminAccountID := apitest.RandomAccountID()
		accountID := apitest.RandomAccountID()

		tierFree := proto.SkypassTier_FREE

		typeBaseCard := proto.ItemType_SW_BASE_CARDS

		season2 := uint16(2)
		season3 := uint16(3)

		var reward1, reward2 data.SkypassReward

		var rewardLister *mock.MockRewardLister
		var rewardApplier *mock.MockRewardApplier

		// Setup
		{
			// Mocks
			{
				ctrl := gomock.NewController(t)

				rewardLister = mock.NewMockRewardLister(ctrl)
				rewardApplier = mock.NewMockRewardApplier(ctrl)
			}

			// Skypass rewards
			{
				reward1 = data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Level:     1,
						Season:    season2,
						Tier:      &tierFree,
						ItemType:  &typeBaseCard,
						Amount:    1,
						UpdatedBy: adminAccountID,
					},
				}

				err := data.DB.Save(&reward1)
				require.NoError(t, err)

				reward2 = data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Level:     1,
						Season:    season3,
						Tier:      &tierFree,
						ItemType:  &typeBaseCard,
						Amount:    1,
						UpdatedBy: adminAccountID,
					},
				}

				err = data.DB.Save(&reward2)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.SkypassRewards().Truncate()
					require.NoError(t, err)
				})
			}
		}

		claimer := skypass.NewClaimer(rewardLister, rewardApplier)

		t.Run("claims rewards when rewards are not claimed yet, are claimable and earned", func(t *testing.T) {
			t.Cleanup(func() {
				err := data.DB.SkypassRewardsClaims().Truncate()
				require.NoError(t, err)
			})

			rewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season2).Return([]*proto.SkypassLevel{
				{
					Earned: true,
					Rewards: []*proto.SkypassReward{{
						ID:        reward1.ID,
						Claimable: true,
						Claimed:   false,
					}},
				},
			}, nil)
			rewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season3).Return([]*proto.SkypassLevel{
				{
					Earned: true,
					Rewards: []*proto.SkypassReward{{
						ID:        reward2.ID,
						Claimable: true,
						Claimed:   false,
					}},
				},
			}, nil)

			gainedReward1 := &proto.Reward{
				Type: proto.RewardType_HERO,
				Hero: &proto.RewardHero{Hero: proto.Hero_ARI},
			}
			gainedReward2 := &proto.Reward{
				Type: proto.RewardType_HERO,
				Hero: &proto.RewardHero{Hero: proto.Hero_MIRA},
			}

			rewardApplier.EXPECT().ApplyReward(gomock.Any(), gomock.Any(), accountID, gomock.Any()).
				DoAndReturn(func(_ context.Context, _ db.Session, _ proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, error) {
					assert.NotEqual(t, reward1, reward)
					assert.Equal(t, reward1.ID, reward.ID)

					return []*proto.Reward{gainedReward1}, nil
				})
			rewardApplier.EXPECT().ApplyReward(gomock.Any(), gomock.Any(), accountID, gomock.Any()).
				DoAndReturn(func(_ context.Context, _ db.Session, _ proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, error) {
					assert.NotEqual(t, reward2, reward)
					assert.Equal(t, reward2.ID, reward.ID)

					return []*proto.Reward{gainedReward2}, nil
				})

			gainedRewards, err := claimer.ClaimRewards(context.Background(), accountID, []uint64{reward1.ID, reward2.ID})
			require.NoError(t, err)

			require.Len(t, gainedRewards, 2)
			assert.Equal(t, gainedReward1, gainedRewards[0])
			assert.Equal(t, gainedReward2, gainedRewards[1])

			count, err := data.DB.SkypassRewardsClaims().Find(
				db.Cond{"account_id": accountID, "skypass_rewards_id": reward1.ID},
			).Count()
			require.NoError(t, err)
			assert.Equal(t, 1, int(count))

			count, err = data.DB.SkypassRewardsClaims().Find(
				db.Cond{"account_id": accountID, "skypass_rewards_id": reward2.ID},
			).Count()
			require.NoError(t, err)
			assert.Equal(t, 1, int(count))
		})

		t.Run("runs the process twice when error of item already exists is returned", func(t *testing.T) {
			t.Cleanup(func() {
				err := data.DB.SkypassRewardsClaims().Truncate()
				require.NoError(t, err)
			})

			reward1proto := &proto.SkypassReward{
				ID:        reward1.ID,
				Claimable: true,
				Claimed:   false,
			}
			reward2proto := &proto.SkypassReward{
				ID:        reward2.ID,
				Claimable: true,
				Claimed:   false,
			}

			rewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season2).Return([]*proto.SkypassLevel{
				{
					Earned:  true,
					Rewards: []*proto.SkypassReward{reward1proto},
				},
			}, nil).Times(2)
			rewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season3).Return([]*proto.SkypassLevel{
				{
					Earned:  true,
					Rewards: []*proto.SkypassReward{reward2proto},
				},
			}, nil).Times(2)

			gainedReward1 := &proto.Reward{
				Type: proto.RewardType_HERO,
				Hero: &proto.RewardHero{Hero: proto.Hero_ARI},
			}
			gainedReward2 := &proto.Reward{
				Type: proto.RewardType_HERO,
				Hero: &proto.RewardHero{Hero: proto.Hero_MIRA},
			}

			rewardApplier.EXPECT().ApplyReward(gomock.Any(), gomock.Any(), accountID, &data.SkypassReward{SkypassReward: reward1proto}).Return([]*proto.Reward{gainedReward1}, nil)
			rewardApplier.EXPECT().ApplyReward(gomock.Any(), gomock.Any(), accountID, &data.SkypassReward{SkypassReward: reward2proto}).Return(nil, fmt.Errorf("some error"))
			rewardApplier.EXPECT().ApplyReward(gomock.Any(), gomock.Any(), accountID, &data.SkypassReward{SkypassReward: reward1proto}).Return([]*proto.Reward{gainedReward1}, nil)
			rewardApplier.EXPECT().ApplyReward(gomock.Any(), gomock.Any(), accountID, &data.SkypassReward{SkypassReward: reward2proto}).Return([]*proto.Reward{gainedReward2}, nil)

			gainedRewards, err := claimer.ClaimRewards(context.Background(), accountID, []uint64{reward1.ID, reward2.ID})
			require.NoError(t, err)

			require.Len(t, gainedRewards, 2)
			assert.Equal(t, gainedReward1, gainedRewards[0])
			assert.Equal(t, gainedReward2, gainedRewards[1])

			count, err := data.DB.SkypassRewardsClaims().Find(
				db.Cond{"account_id": accountID, "skypass_rewards_id": reward1.ID},
			).Count()
			require.NoError(t, err)
			assert.Equal(t, 1, int(count))

			count, err = data.DB.SkypassRewardsClaims().Find(
				db.Cond{"account_id": accountID, "skypass_rewards_id": reward2.ID},
			).Count()
			require.NoError(t, err)
			assert.Equal(t, 1, int(count))
		})

		t.Run("does not claim rewards when rewards are not claimed yet, are claimable but not earned", func(t *testing.T) {
			t.Cleanup(func() {
				err := data.DB.SkypassRewardsClaims().Truncate()
				require.NoError(t, err)
			})

			rewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season2).Return([]*proto.SkypassLevel{
				{
					Earned: false,
					Rewards: []*proto.SkypassReward{{
						ID:        reward1.ID,
						Claimable: true,
						Claimed:   false,
					}},
				},
			}, nil)

			gainedRewards, err := claimer.ClaimRewards(context.Background(), accountID, []uint64{reward1.ID})
			require.ErrorContains(t, err, "not earned")
			assert.Empty(t, gainedRewards)

			count, err := data.DB.SkypassRewardsClaims().Find(
				db.Cond{"account_id": accountID, "skypass_rewards_id": reward1.ID},
			).Count()
			require.NoError(t, err)
			assert.Equal(t, 0, int(count))
		})

		t.Run("does not claim rewards when rewards are not listed", func(t *testing.T) {
			t.Cleanup(func() {
				err := data.DB.SkypassRewardsClaims().Truncate()
				require.NoError(t, err)
			})

			rewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season2).Return([]*proto.SkypassLevel{}, nil)

			gainedRewards, err := claimer.ClaimRewards(context.Background(), accountID, []uint64{reward1.ID})
			require.ErrorContains(t, err, "not listed")
			assert.Empty(t, gainedRewards)

			count, err := data.DB.SkypassRewardsClaims().Find(
				db.Cond{"account_id": accountID, "skypass_rewards_id": reward1.ID},
			).Count()
			require.NoError(t, err)
			assert.Equal(t, 0, int(count))
		})

		t.Run("does not claim rewards when rewards are not claimed yet, are earned but not claimable", func(t *testing.T) {
			t.Cleanup(func() {
				err := data.DB.SkypassRewardsClaims().Truncate()
				require.NoError(t, err)
			})

			rewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season2).Return([]*proto.SkypassLevel{
				{
					Earned: true,
					Rewards: []*proto.SkypassReward{{
						ID:        reward1.ID,
						Claimable: false,
						Claimed:   false,
					}},
				},
			}, nil)

			gainedRewards, err := claimer.ClaimRewards(context.Background(), accountID, []uint64{reward1.ID})
			require.ErrorContains(t, err, "not claimable")
			assert.Empty(t, gainedRewards)

			count, err := data.DB.SkypassRewardsClaims().Find(
				db.Cond{"account_id": accountID, "skypass_rewards_id": reward1.ID},
			).Count()
			require.NoError(t, err)
			assert.Equal(t, 0, int(count))
		})

		t.Run("does nothing when rewards are claimed already, are earned and claimable", func(t *testing.T) {
			var claim *data.SkypassRewardClaim

			// Setup
			{
				claim = &data.SkypassRewardClaim{
					SkypassRewardID: reward1.ID,
					AccountID:       accountID,
					Rewards: []*proto.Reward{
						{
							Type: proto.RewardType_HERO,
						},
					},
				}
				err := data.DB.Save(claim)
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.SkypassRewardsClaims().Truncate()
				require.NoError(t, err)
			})

			rewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season2).Return([]*proto.SkypassLevel{
				{
					Earned: true,
					Rewards: []*proto.SkypassReward{{
						ID:            reward1.ID,
						Claimable:     true,
						Claimed:       true,
						GainedRewards: claim.Rewards,
					}},
				},
			}, nil)

			gainedRewards, err := claimer.ClaimRewards(context.Background(), accountID, []uint64{reward1.ID})
			require.NoError(t, err)
			assert.Equal(t, []*proto.Reward(claim.Rewards), gainedRewards)
		})

		t.Run("does not fail when applier returns no gained rewards", func(t *testing.T) {
			t.Cleanup(func() {
				err := data.DB.SkypassRewardsClaims().Truncate()
				require.NoError(t, err)
			})

			rewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season2).Return([]*proto.SkypassLevel{
				{
					Earned: true,
					Rewards: []*proto.SkypassReward{{
						ID:        reward1.ID,
						Claimable: true,
						Claimed:   false,
					}},
				},
			}, nil)

			rewardApplier.EXPECT().ApplyReward(gomock.Any(), gomock.Any(), accountID, gomock.Any()).Return(
				[]*proto.Reward{},
				nil,
			)

			gainedRewards, err := claimer.ClaimRewards(context.Background(), accountID, []uint64{reward1.ID})
			require.NoError(t, err)

			require.Len(t, gainedRewards, 0)

			count, err := data.DB.SkypassRewardsClaims().Find(
				db.Cond{"account_id": accountID, "skypass_rewards_id": reward1.ID},
			).Count()
			require.NoError(t, err)
			assert.Equal(t, 1, int(count))
		})
	})
}
