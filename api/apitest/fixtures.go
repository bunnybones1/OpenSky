//go:build integration

package apitest

import (
	"github.com/0xsequence/go-sequence/lib/prototyp"

	"github.com/horizon-games/OpenSky/api/data"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
)

type fixtures struct {
	UserA *data.Account
	UserB *data.Account

	UserNoExpA *data.Account
	UserNoExpB *data.Account

	Cards []data.Card
}

func GenFixtures() (*fixtures, error) {
	f := &fixtures{}

	TruncateAll()

	// UserA
	{
		accountID, _, err := CreateRandomAccount("GenFixtures-1")
		if err != nil {
			return nil, err
		}

		f.UserA, err = data.DB.Accounts(nil).FindByID(accountID)
		if err != nil {
			return nil, err
		}
		f.UserA.Level = playerRank.MinimumLevelForRanked
		err = data.DB.Save(f.UserA)
		if err != nil {
			return nil, err
		}
	}

	// UserB
	{
		accountID, _, err := CreateRandomAccount("GenFixtures-2")
		if err != nil {
			return nil, err
		}

		f.UserB, err = data.DB.Accounts(nil).FindByID(accountID)
		if err != nil {
			return nil, err
		}
		f.UserB.Level = playerRank.MinimumLevelForRanked
		err = data.DB.Save(f.UserB)
		if err != nil {
			return nil, err
		}
	}

	{
		accountID, _, err := CreateRandomAccount("GenFixtures-3")
		if err != nil {
			return nil, err
		}

		f.UserNoExpA, err = data.DB.Accounts(nil).FindByID(accountID)
		if err != nil {
			return nil, err
		}
	}

	{
		accountID, _, err := CreateRandomAccount("GenFixtures-4")
		if err != nil {
			return nil, err
		}

		f.UserNoExpB, err = data.DB.Accounts(nil).FindByID(accountID)
		if err != nil {
			return nil, err
		}
	}

	f.Cards = []data.Card{
		{
			Card: &proto.Card{
				ID:          20900,
				Class:       proto.CardClass_INT,
				Element:     proto.CardElement_FIRE,
				Type:        proto.CardType_SPELL,
				Keywords:    []string{},
				Name:        "Stone Phoenix",
				Asset:       "1_A-asset",
				ManaCost:    8,
				Description: "Sleep (This creator can't attack)",
				Status:      proto.CardStatus_PLAY,
			},
		},
		{
			Card: &proto.Card{
				ID:          20901,
				Class:       proto.CardClass_INT,
				Element:     proto.CardElement_EARTH,
				Type:        proto.CardType_UNIT,
				Keywords:    []string{},
				Name:        "Metal Toad",
				Description: "Something lost and never seen",
				ManaCost:    1,
				Power:       5,
				Health:      7,
				Asset:       "2_B-asset",
				Status:      proto.CardStatus_PLAY,
			},
		},
		{
			Card: &proto.Card{
				ID:          20902,
				Class:       proto.CardClass_INT,
				Element:     proto.CardElement_WATER,
				Type:        proto.CardType_UNIT,
				Keywords:    []string{},
				Name:        "Fire Monkey",
				Description: "Fight, sometimes they fight",
				ManaCost:    15,
				Power:       23,
				Health:      799,
				Asset:       "3_C-asset",
				Status:      proto.CardStatus_PLAY,
			},
		},
		{
			Card: &proto.Card{
				ID:          20903,
				Class:       proto.CardClass_INT,
				Element:     proto.CardElement_FIRE,
				Type:        proto.CardType_SPELL,
				Keywords:    []string{"GUARD", "WITHER"},
				Name:        "Rare Whale",
				Description: "Giving gave nothing back",
				ManaCost:    55,
				Power:       12,
				Health:      69,
				Asset:       "4_D-asset",
				Status:      proto.CardStatus_PLAY,
			},
		},
	}

	for i := range f.Cards {
		err := data.DB.Save(&f.Cards[i])
		if err != nil {
			return nil, err
		}

		// Set a balance for this card and user
		err = data.DB.Save(&data.Item{Item: &proto.Item{
			AccountID: f.UserA.ID,
			ItemType:  proto.ItemType_SW_BASE_CARDS,
			TokenID:   uint64(f.Cards[i].ID),
			Balance:   prototyp.NewBigInt(1),
		}})
		if err != nil {
			return nil, err
		}
	}

	return f, nil
}

func GenerateRankStates() map[proto.PlayerRank]map[proto.PlayerRankStage]*ranking.State {
	var rankStates map[proto.PlayerRank]map[proto.PlayerRankStage]*ranking.State

	// populating rank states
	p1 := ranking.InitialRankState()
	p2 := ranking.InitialRankState()
	rankStates = map[proto.PlayerRank]map[proto.PlayerRankStage]*ranking.State{}

	for len(rankStates) < 5 {
		p1, _ = ranking.UpdateRankState(ranking.Win, p1, p2)
		r := playerRank.LookupRankByScore(p1.RP)

		if rankStates[r.Rank] == nil {
			rankStates[r.Rank] = map[proto.PlayerRankStage]*ranking.State{}
		}
		if rankStates[r.Rank][r.Stage] == nil {
			rankStates[r.Rank][r.Stage] = p1
		}
	}

	return rankStates
}
