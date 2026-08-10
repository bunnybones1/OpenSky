//go:build integration

package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestListHeroesByLevel(t *testing.T) {
	var rewards []*data.SkypassReward

	// Setup
	{
		// Skypass rewards
		{
			heroItemType := proto.ItemType_SW_HERO
			tier := proto.SkypassTier_FREE
			season := data.CurrentSeason()

			for i := 1; i <= 3; i++ {
				s := season

				if i == 2 {
					s += 1
				}

				reward := &data.SkypassReward{SkypassReward: &proto.SkypassReward{
					ItemType: &heroItemType,
					Season:   s,
					Level:    uint16(i),
					Tier:     &tier,
					Attributes: &proto.SkypassRewardAttributes{
						TokenIDs: []uint64{uint64(i)},
					},
				}}

				err := data.DB.Save(reward)
				require.NoError(t, err)

				rewards = append(rewards, reward)
			}

			t.Cleanup(func() {
				err := data.DB.SkypassRewards().Truncate()
				require.NoError(t, err)
			})
		}
	}

	heroes, err := data.ListHeroesByLevel(data.DB.Session)
	require.NoError(t, err)

	require.Len(t, heroes, 2)
	assert.Equal(t, proto.Hero(rewards[0].Attributes.TokenIDs[0]), heroes[rewards[0].Level][0])
	assert.Empty(t, heroes[rewards[1].Level])
	assert.Equal(t, proto.Hero(rewards[2].Attributes.TokenIDs[0]), heroes[rewards[2].Level][0])
}

func TestListLevelsByHero(t *testing.T) {
	var rewards []*data.SkypassReward

	// Setup
	{
		// Skypass rewards
		{
			heroItemType := proto.ItemType_SW_HERO
			tier := proto.SkypassTier_FREE
			season := data.CurrentSeason()

			for i := 1; i <= 3; i++ {
				s := season

				if i == 2 {
					s += 1
				}

				reward := &data.SkypassReward{SkypassReward: &proto.SkypassReward{
					ItemType: &heroItemType,
					Season:   s,
					Level:    uint16(i),
					Tier:     &tier,
					Attributes: &proto.SkypassRewardAttributes{
						TokenIDs: []uint64{uint64(i)},
					},
				}}

				err := data.DB.Save(reward)
				require.NoError(t, err)

				rewards = append(rewards, reward)
			}

			t.Cleanup(func() {
				err := data.DB.SkypassRewards().Truncate()
				require.NoError(t, err)
			})
		}
	}

	heroes, err := data.ListLevelsByHero(data.DB.Session)
	require.NoError(t, err)

	require.Len(t, heroes, 2)
	assert.Equal(t, heroes[proto.Hero(rewards[0].Attributes.TokenIDs[0]).String()], rewards[0].Level)
	assert.Empty(t, heroes[proto.Hero(rewards[1].Attributes.TokenIDs[0]).String()])
	assert.Equal(t, heroes[proto.Hero(rewards[2].Attributes.TokenIDs[0]).String()], rewards[2].Level)
}

func TestListHeroesInLevel(t *testing.T) {
	var rewards []*data.SkypassReward

	// Setup
	{
		// Skypass rewards
		{
			heroItemType := proto.ItemType_SW_HERO
			tier := proto.SkypassTier_FREE
			season := data.CurrentSeason()

			for i := 1; i <= 2; i++ {
				s := season

				if i == 2 {
					s += 1
				}

				reward := &data.SkypassReward{SkypassReward: &proto.SkypassReward{
					ItemType: &heroItemType,
					Season:   s,
					Level:    uint16(i),
					Tier:     &tier,
					Attributes: &proto.SkypassRewardAttributes{
						TokenIDs: []uint64{uint64(i)},
					},
				}}

				err := data.DB.Save(reward)
				require.NoError(t, err)

				rewards = append(rewards, reward)
			}

			t.Cleanup(func() {
				err := data.DB.SkypassRewards().Truncate()
				require.NoError(t, err)
			})
		}
	}

	heroes, err := data.ListHeroesInLevel(data.DB.Session, rewards[0].Level)
	require.NoError(t, err)
	require.Len(t, heroes, 1)
	assert.Equal(t, proto.Hero(rewards[0].Attributes.TokenIDs[0]), heroes[0])

	heroes, err = data.ListHeroesInLevel(data.DB.Session, rewards[1].Level)
	require.NoError(t, err)
	require.Empty(t, heroes)
}
