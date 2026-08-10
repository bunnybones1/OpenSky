//go:build integration

package rpc_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func createCards() error {
	_, err := data.DB.SQL().Exec(fmt.Sprintf(`TRUNCATE TABLE %q CASCADE`, data.DB.Items().Name()))
	if err != nil {
		return err
	}

	err = data.DB.Cards().Find(db.Cond{"id": db.Gte(20000)}).Delete()
	if err != nil {
		return err
	}

	cards := []data.Card{
		{
			Card: &proto.Card{
				ID:          20900,
				Class:       proto.CardClass_INT,
				Element:     proto.CardElement_FIRE,
				Type:        proto.CardType_SPELL,
				ManaCost:    7,
				Keywords:    []string{},
				Name:        "Stone Phoenix",
				Description: "Sleep (This creator can't attack)",
				Status:      proto.CardStatus_PLAY,
			},
		},
		{
			Card: &proto.Card{
				ID:          20901,
				Class:       proto.CardClass_INT,
				Element:     proto.CardElement_EARTH,
				Type:        proto.CardType_SPELL,
				Keywords:    []string{},
				Name:        "Metal Toad",
				Description: "Something lost and never seen",
				ManaCost:    1,
				Power:       5,
				Health:      7,
				Status:      proto.CardStatus_PLAY,
			},
		},
		{
			Card: &proto.Card{
				ID:          20902,
				Class:       proto.CardClass_INT,
				Element:     proto.CardElement_WATER,
				Type:        proto.CardType_SPELL,
				Keywords:    []string{},
				Name:        "Fire Monkey",
				Description: "Fight, sometimes they fight",
				ManaCost:    15,
				Power:       23,
				Health:      799,
				Status:      proto.CardStatus_PLAY,
			},
		},
		{
			Card: &proto.Card{
				ID:          20903,
				Class:       proto.CardClass_INT,
				Element:     proto.CardElement_FIRE,
				Type:        proto.CardType_SPELL,
				ManaCost:    -1,
				Keywords:    []string{"GUARD", "WITHER"},
				Name:        "Rare Whale",
				Description: "Giving gave nothing back",
				Power:       12,
				Health:      69,
				Status:      proto.CardStatus_PLAY,
			},
		},
	}

	for i := range cards {
		err := data.DB.Save(&cards[i])
		if err != nil {
			return err
		}
	}

	return nil
}

func TestCreateCards(t *testing.T) {
	err := createCards()
	assert.NoError(t, err)
}

func TestSearchCards(t *testing.T) {
	// Inject fake cards
	err := createCards()
	assert.NoError(t, err)

	{
		_, res, err := apitest.Client().SearchCards(context.Background(), nil, &proto.SearchCardsRequest{})
		assert.NoError(t, err)
		assert.NotZero(t, len(res))
	}

	{
		pageSize := uint32(10)

		_, res, err := apitest.Client().SearchCards(context.Background(),
			&proto.Page{
				PageSize: &pageSize,
			},
			&proto.SearchCardsRequest{},
		)

		assert.NoError(t, err)
		assert.Equal(t, 10, len(res))
	}

	{
		pageSize := uint32(2)

		_, res, err := apitest.Client().SearchCards(context.Background(),
			&proto.Page{
				PageSize: &pageSize,
			},
			&proto.SearchCardsRequest{},
		)
		assert.NoError(t, err)
		assert.Equal(t, 2, len(res))
	}

	{
		pageSize := uint32(500)
		_, res, err := apitest.Client().SearchCards(context.Background(),
			&proto.Page{
				PageSize: &pageSize,
			},
			&proto.SearchCardsRequest{},
		)
		assert.NoError(t, err)
		isNegative := false
		for i := range res {
			if res[i].Card.ManaCost < 0 {
				isNegative = true
			} else {
				assert.False(t, isNegative)
			}
		}
	}

	{
		pageSize := uint32(2)
		searchText := "Ston"
		_, res, err := apitest.Client().SearchCards(context.Background(),
			&proto.Page{
				PageSize: &pageSize,
			},
			&proto.SearchCardsRequest{
				Criteria: &proto.CardSearchCriteria{
					CardElement: []proto.CardElement{proto.CardElement_EARTH},
					SearchText:  &searchText,
				},
			})
		assert.NoError(t, err)

		found := false
		for _, c := range res {
			if c.Card.Name == "Stone Fist" {
				found = true
			}
		}
		assert.True(t, found)
	}

}

func TestSearchOwnedCards(t *testing.T) {
	trueVal := true
	falseVal := false

	// search for owned cards without account context
	{
		_, _, err := apitest.Client().SearchCards(context.Background(), nil, &proto.SearchCardsRequest{
			Criteria: &proto.CardSearchCriteria{
				OwnedCards: &trueVal,
			},
		})
		apitest.CheckErrorFormat(t, err)
		assert.Error(t, err)
	}

	// search for not owned cards without account context
	{
		_, _, err := apitest.Client().SearchCards(context.Background(), nil, &proto.SearchCardsRequest{
			Criteria: &proto.CardSearchCriteria{
				OwnedCards: &falseVal,
			},
		})
		apitest.CheckErrorFormat(t, err)
		assert.Error(t, err)
	}

	{
		f, err := apitest.GenFixtures()
		assert.NoError(t, err)

		{
			_, res, err := apitest.Client().SearchCards(apitest.AccountContext(f.UserA.ID), nil, &proto.SearchCardsRequest{
				Criteria: &proto.CardSearchCriteria{
					OwnedCards: &trueVal,
				},
			})
			assert.NoError(t, err)
			assert.NotZero(t, len(res))
		}

		{ // case insensitive name search

			searchString := "phoeni"
			_, res, err := apitest.Client().SearchCards(apitest.AccountContext(f.UserA.ID), nil, &proto.SearchCardsRequest{
				Criteria: &proto.CardSearchCriteria{
					OwnedCards: &trueVal,
					SearchText: &searchString,
				},
			})
			assert.NoError(t, err)
			assert.NotZero(t, len(res))
			assert.Equal(t, 1, len(res))
		}

		{ // search by keyword
			searchString := "GuARD"
			_, res, err := apitest.Client().SearchCards(apitest.AccountContext(f.UserA.ID), nil, &proto.SearchCardsRequest{
				Criteria: &proto.CardSearchCriteria{
					OwnedCards: &trueVal,
					SearchText: &searchString,
				},
			})
			assert.NoError(t, err)
			assert.NotZero(t, len(res))
		}

		{ // search by element type
			_, res, err := apitest.Client().SearchCards(apitest.AccountContext(f.UserA.ID), nil, &proto.SearchCardsRequest{
				Criteria: &proto.CardSearchCriteria{
					OwnedCards:  &trueVal,
					CardElement: []proto.CardElement{proto.CardElement_FIRE},
				},
			})

			assert.NoError(t, err)
			assert.Len(t, res, 2)
		}
	}
}
