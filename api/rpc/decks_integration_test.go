//go:build integration

package rpc_test

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/horizon-games/OpenSky/api/lib/metrics"
	"github.com/horizon-games/OpenSky/api/lib/skypass"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestListDecks(t *testing.T) {
	var accountID proto.AccountID

	var conquestV2PointsCalculator *mock.MockConquestV2PointsCalculator

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestListDecks")
			require.NoError(t, err)
		}

		// Decks
		{
			err := data.CreateStarterDecks(data.DB, accountID)
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestV2PointsCalculator = mock.NewMockConquestV2PointsCalculator(ctrl)

			apiService := apitest.APIService()

			originalConquestV2PointsCalculator := apiService.RPC.ConquestV2PointsCalculator

			apiService.RPC.ConquestV2PointsCalculator = conquestV2PointsCalculator

			t.Cleanup(func() {
				apiService.RPC.ConquestV2PointsCalculator = originalConquestV2PointsCalculator
			})
		}
	}

	ctx := apitest.AccountContext(accountID)
	ctx = apitest.DBContext(ctx)

	conquestV2points := uint64(10)

	conquestV2PointsCalculator.EXPECT().FromDeckString(gomock.Any(), accountID, gomock.Any()).Return(conquestV2points, nil).Times(5)

	page, decks, err := apitest.Client().ListDecks(ctx, nil)
	require.NoError(t, err)
	require.NotNil(t, page)

	require.Len(t, decks, 5)
	deck := decks[0]
	assert.Equal(t, int(conquestV2points), int(deck.ConquestV2Points))
}

func TestFilterOutTokens(t *testing.T) {
	err := createCards()
	assert.NoError(t, err)

	{
		_, res, err := apitest.Client().SearchCards(context.Background(), nil, &proto.SearchCardsRequest{})
		assert.NoError(t, err)
		assert.NotZero(t, len(res))

		for i := range res {
			assert.NotEqual(t, "tok", res[i].Card.Class)
		}
	}
}

func TestCreateSingleClassDeck(t *testing.T) {
	accountID, _, err := apitest.CreateRandomAccount("TestCreateSingleClassDeck")
	require.NoError(t, err)

	testCreateSingleClassDeck(t, accountID)
}

func testCreateSingleClassDeck(t *testing.T, accountID proto.AccountID) []*proto.Deck {
	err := createCards()
	assert.NoError(t, err)

	cardIDs := []uint64{}
	{
		_, res, err := apitest.Client().SearchCards(context.Background(), nil, &proto.SearchCardsRequest{
			Criteria: &proto.CardSearchCriteria{
				CardClass: []proto.CardClass{proto.CardClass_HRT},
			},
		})
		assert.NoError(t, err)
		assert.NotZero(t, len(res))

		for i := range res {
			cardIDs = append(cardIDs, res[i].Card.ID)
		}
	}

	{
		_, err := apitest.Client().CreateDeck(apitest.AccountContext(accountID), &proto.CreateDeckRequest{
			Name:    "My deck",
			CardIDs: cardIDs,
		})
		assert.NoError(t, err)

		pageSize := uint32(11)

		respPage, resp, err := apitest.Client().ListDecks(apitest.AccountContext(accountID), &proto.Page{PageSize: &pageSize})
		assert.NoError(t, err)
		assert.Equal(t, 1, len(resp))
		assert.Equal(t, uint32(11), *respPage.PageSize)
	}

	// New deck
	var deckUUID string
	{
		art := strings.Repeat("a", 64)
		deckCardIDs := []uint64{}
		for _, id := range cardIDs[0:2] {
			deckCardIDs = append(deckCardIDs, id)
		}

		res, err := apitest.Client().CreateDeck(apitest.AccountContext(accountID), &proto.CreateDeckRequest{
			Name:    "My deck",
			CardIDs: deckCardIDs,
			Art:     &art,
		})
		assert.NoError(t, err)
		assert.NotZero(t, res.UUID)
		assert.Equal(t, art, res.Art)

		deckUUID = res.UUID
	}

	// Fetch deck
	{
		res, err := apitest.Client().GetDeck(apitest.AccountContext(accountID), &proto.DeckRequest{UUID: &deckUUID})
		assert.NoError(t, err)

		assert.Equal(t, 2, len(res.CardIDs))
		assert.True(t, isDeckStringEqual(res.DeckString, res.CardIDs))
	}

	// Another deck
	{
		cardIDsSubset := []uint64{}
		for _, id := range cardIDs[4:6] {
			cardIDsSubset = append(cardIDsSubset, id)
		}

		res, err := apitest.Client().CreateDeck(apitest.AccountContext(accountID), &proto.CreateDeckRequest{
			Name:    "My 2nd deck",
			CardIDs: cardIDsSubset,
		})
		assert.NoError(t, err)
		assert.NotZero(t, res.UUID)

		deckUUID = res.UUID
	}

	// Fetch the other deck
	{
		res, err := apitest.Client().GetDeck(apitest.AccountContext(accountID), &proto.DeckRequest{UUID: &deckUUID})
		assert.NoError(t, err)

		assert.Equal(t, 2, len(res.CardIDs))
		assert.True(t, isDeckStringEqual(res.DeckString, res.CardIDs))
	}

	var decks []*proto.Deck

	// Search the decks
	{
		_, res, err := apitest.Client().SearchDecks(apitest.AccountContext(accountID), nil, &proto.SearchDecksRequest{})
		assert.NoError(t, err)
		assert.Equal(t, 3, len(res))
		decks = res

		for i, deck := range res {
			if deck.DeckType != proto.DeckType_CUSTOM {
				continue
			}
			newCardIDs := []uint64{}
			for _, id := range cardIDs[i+1 : i+2] { // move cursor, so we dont make dupe decks
				newCardIDs = append(newCardIDs, id)
			}

			newDeckName := fmt.Sprintf("deck n-%d", i)
			deck.Name = newDeckName
			deck.CardIDs = newCardIDs

			deckClass, _, _ := data.GetDeckClassFromCardIDs(newCardIDs)

			// set to new deck string aka our new card list
			deck.DeckString, _ = data.EncodeDeckString(newCardIDs, deckClass)

			art := strings.Repeat(strconv.Itoa(i), 64)
			updateDeck := &proto.UpdateDeckRequestDeck{
				DeckClass:  &deck.Class,
				DeckString: deck.DeckString,
				Name:       deck.Name,
				Art:        &art,
			}

			res, err := apitest.Client().UpdateDeck(apitest.AccountContext(accountID), &proto.UpdateDeckRequest{
				UUID: &deck.UUID,
				Deck: updateDeck,
			})

			assert.NoError(t, err)
			assert.Equal(t, newDeckName, res.Name)
			assert.Equal(t, 1, len(res.CardIDs))
			assert.Equal(t, art, res.Art)

			res, err = apitest.Client().GetDeck(apitest.AccountContext(accountID), &proto.DeckRequest{UUID: &deck.UUID})
			assert.NoError(t, err)

			assert.Equal(t, 1, len(res.CardIDs))
			assert.Equal(t, art, res.Art)
		}
	}

	return decks
}

func testCreateMultipleClassDeck(t *testing.T, accountID proto.AccountID, classPair []proto.CardClass, combinationName proto.DeckClass) {
	err := createCards()
	assert.NoError(t, err)

	cardIDs := []uint64{}
	{
		pageSize := uint32(30)

		cards := make([][]*proto.Card, 2)

		for i, cardClass := range classPair {
			_, res, err := apitest.Client().SearchCards(context.Background(),
				&proto.Page{
					PageSize: &pageSize,
				},
				&proto.SearchCardsRequest{
					Criteria: &proto.CardSearchCriteria{
						CardClass: []proto.CardClass{cardClass},
					},
				})
			assert.NoError(t, err)
			require.NotZero(t, len(res), "0 cards in class %s", cardClass)

			for _, card := range res {
				cards[i] = append(cards[i], card.Card)
			}
		}
		require.True(t, (len(cards[0])+len(cards[1])) >= data.DualPrismDeckSize)

		switch {
		case len(cards[0]) > len(cards[1]):
			for _, card := range cards[0][0 : data.DualPrismDeckSize-len(cards[1])] {
				cardIDs = append(cardIDs, card.ID)
			}
			for _, card := range cards[1] {
				cardIDs = append(cardIDs, card.ID)
			}

		case len(cards[0]) < len(cards[1]):
			for _, card := range cards[1][0 : data.DualPrismDeckSize-len(cards[0])] {
				cardIDs = append(cardIDs, card.ID)
			}
			for _, card := range cards[0] {
				cardIDs = append(cardIDs, card.ID)
			}

		default:
			for _, card := range cards[0][0:15] {
				cardIDs = append(cardIDs, card.ID)
			}
			for _, card := range cards[1][0:15] {
				cardIDs = append(cardIDs, card.ID)
			}
		}
	}

	{
		name := classPair[0].String()
		if len(classPair) > 1 {
			name = name + "/" + classPair[1].String()
		}
		deck, err := apitest.Client().CreateDeck(apitest.AccountContext(accountID), &proto.CreateDeckRequest{
			Name:      name,
			CardIDs:   cardIDs,
			DeckClass: &combinationName,
		})
		require.NoError(t, err)

		assert.Equal(t, combinationName, deck.Class)
	}
}

func TestCreateMultipleClassDecks(t *testing.T) {
	accountID, _, err := apitest.CreateRandomAccount("TestCreateMultipleClassDecks")
	require.NoError(t, err)

	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_STR, proto.CardClass_HRT}, proto.DeckClass_STH)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_AGY, proto.CardClass_STR}, proto.DeckClass_STA)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_INT, proto.CardClass_STR}, proto.DeckClass_STI)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_STR, proto.CardClass_WIS}, proto.DeckClass_STW)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_AGY, proto.CardClass_HRT}, proto.DeckClass_HRA)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_HRT, proto.CardClass_INT}, proto.DeckClass_HRI)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_WIS, proto.CardClass_HRT}, proto.DeckClass_HRW)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_AGY, proto.CardClass_INT}, proto.DeckClass_AGI)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_WIS, proto.CardClass_AGY}, proto.DeckClass_AGW)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_WIS, proto.CardClass_INT}, proto.DeckClass_INW)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_WIS}, proto.DeckClass_INW)
}

func TestCreateInvalidDecks(t *testing.T) {
	accountID, _, err := apitest.CreateRandomAccount("TestCreateInvalidDecks")
	require.NoError(t, err)

	{
		_, err := apitest.Client().CreateDeck(apitest.AccountContext(accountID), &proto.CreateDeckRequest{
			Name:    "My invalid deck",
			CardIDs: []uint64{10000, 10002, 10003},
		})
		assert.Error(t, err)
	}

	{
		cardIDs := []uint64{}

		_, res, err := apitest.Client().SearchCards(context.Background(), nil, &proto.SearchCardsRequest{
			Criteria: &proto.CardSearchCriteria{
				CardClass: []proto.CardClass{proto.CardClass_HRT},
			},
		})
		assert.NoError(t, err)
		assert.NotZero(t, len(res))

		for i := range res {
			cardIDs = append(cardIDs, res[i].Card.ID)
		}

		_, err = apitest.Client().CreateDeck(apitest.AccountContext(accountID), &proto.CreateDeckRequest{
			Name:    "My invalid deck",
			CardIDs: append(cardIDs, 10002),
		})
		assert.Error(t, err)
	}
}

func TestDeleteDeck(t *testing.T) {
	accountID, _, err := apitest.CreateRandomAccount("TestDeleteDeck")
	require.NoError(t, err)

	// first lets make two decks
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_STR, proto.CardClass_HRT}, proto.DeckClass_STH)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_AGY, proto.CardClass_STR}, proto.DeckClass_STA)

	// now lets send delete with no proper conditions -- expecting error
	_, err = apitest.Client().DeleteDeck(apitest.AccountContext(accountID), &proto.DeckRequest{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must provide either uuid or deck_string")

	// fetch one of the decks
	_, decks, err := apitest.Client().SearchDecks(apitest.AccountContext(accountID), nil, &proto.SearchDecksRequest{})
	assert.NoError(t, err)
	assert.NotEmpty(t, decks)
	var deckString string
	for _, d := range decks {
		if d.DeckType == proto.DeckType_CUSTOM {
			deckString = d.DeckString
		}
	}

	// now delete it
	_, err = apitest.Client().DeleteDeck(apitest.AccountContext(accountID), &proto.DeckRequest{DeckString: &deckString})
	assert.NoError(t, err)

	// ensure its no longer there by trying to query for it
	_, decks, err = apitest.Client().SearchDecks(apitest.AccountContext(accountID), nil, &proto.SearchDecksRequest{
		DeckString: &deckString,
	})
	assert.NoError(t, err)
	assert.Empty(t, decks)
}

func TestFavoriteDeck(t *testing.T) {
	var favorites int

	accountID, _, err := apitest.CreateRandomAccount("TestFavoriteDeck")
	require.NoError(t, err)

	err = data.DB.Decks().Truncate()
	assert.NoError(t, err)

	// create some decks
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_STR, proto.CardClass_HRT}, proto.DeckClass_STH)
	testCreateMultipleClassDeck(t, accountID, []proto.CardClass{proto.CardClass_AGY, proto.CardClass_STR}, proto.DeckClass_STA)

	// fetch decks
	_, decks, err := apitest.Client().SearchDecks(apitest.AccountContext(accountID), nil, &proto.SearchDecksRequest{})
	assert.NoError(t, err)
	assert.NotEmpty(t, decks)

	favorites = 0
	for _, deck := range decks {
		if deck.IsFavorite || deck.FavoritedAt != nil {
			favorites++
		}
	}
	assert.Equal(t, 0, favorites)

	deck1UUID := decks[0].UUID
	deck2UUID := decks[1].UUID

	// set favorite status
	_, err = apitest.Client().FavoriteDeck(apitest.AccountContext(accountID), deck1UUID)
	assert.NoError(t, err)

	_, decks, err = apitest.Client().SearchDecks(apitest.AccountContext(accountID), nil, &proto.SearchDecksRequest{})
	assert.NoError(t, err)
	assert.NotEmpty(t, decks)

	favorites = 0
	for _, deck := range decks {
		if deck.IsFavorite || deck.FavoritedAt != nil {
			favorites++
		}
	}
	assert.Equal(t, 1, favorites, "expecting 1 favorite deck")

	// unset favorite status
	_, err = apitest.Client().UnfavoriteDeck(apitest.AccountContext(accountID), deck1UUID)
	assert.NoError(t, err)

	_, decks, err = apitest.Client().SearchDecks(apitest.AccountContext(accountID), nil, &proto.SearchDecksRequest{})
	assert.NoError(t, err)
	assert.NotEmpty(t, decks)

	favorites = 0
	for _, deck := range decks {
		if deck.IsFavorite || deck.FavoritedAt != nil {
			favorites++
		}
	}
	assert.Equal(t, 0, favorites, "expecting 0 favorite decks")

	var isFavorite bool

	// toggle favorite status in the thwo decks
	isFavorite, err = apitest.Client().ToggleDeckFavorite(apitest.AccountContext(accountID), deck1UUID)
	assert.NoError(t, err)
	assert.True(t, isFavorite)

	isFavorite, err = apitest.Client().ToggleDeckFavorite(apitest.AccountContext(accountID), deck2UUID)
	assert.NoError(t, err)
	assert.True(t, isFavorite)

	_, decks, err = apitest.Client().SearchDecks(apitest.AccountContext(accountID), nil, &proto.SearchDecksRequest{})
	assert.NoError(t, err)
	assert.NotEmpty(t, decks)

	favorites = 0
	for _, deck := range decks {
		if deck.IsFavorite || deck.FavoritedAt != nil {
			favorites++
		}
	}
	assert.Equal(t, 2, favorites, "expecting 2 favorite decks")

	// toggle favorite status
	isFavorite, err = apitest.Client().ToggleDeckFavorite(apitest.AccountContext(accountID), deck2UUID)
	assert.NoError(t, err)
	assert.False(t, isFavorite)

	_, decks, err = apitest.Client().SearchDecks(apitest.AccountContext(accountID), nil, &proto.SearchDecksRequest{})
	assert.NoError(t, err)
	assert.NotEmpty(t, decks)

	favorites = 0
	for _, deck := range decks {
		if deck.IsFavorite || deck.FavoritedAt != nil {
			favorites++
		}
	}
	assert.Equal(t, 1, favorites, "expecting 1 favorite deck")

	// make sure ListDecks displays similar results
	_, decks, err = apitest.Client().ListDecks(apitest.AccountContext(accountID), nil)
	assert.NoError(t, err)
	assert.NotEmpty(t, decks)

	favorites = 0
	for _, deck := range decks {
		if deck.IsFavorite || deck.FavoritedAt != nil {
			favorites++
		}
	}
	assert.Equal(t, 1, favorites, "expecting 1 favorite deck")

	// make sure GetDeck displays similar results
	deck1, err := apitest.Client().GetDeck(apitest.AccountContext(accountID), &proto.DeckRequest{UUID: &deck1UUID})
	assert.NoError(t, err)
	assert.NotEmpty(t, deck1)

	assert.True(t, deck1.IsFavorite)
	assert.NotNil(t, deck1.FavoritedAt)
	assert.NotZero(t, deck1.FavoritedAt)

	deck2, err := apitest.Client().GetDeck(apitest.AccountContext(accountID), &proto.DeckRequest{UUID: &deck2UUID})
	assert.NoError(t, err)
	assert.NotEmpty(t, deck2)

	assert.False(t, deck2.IsFavorite)
	assert.Nil(t, deck2.FavoritedAt)
}

func TestListUnlockedDeckClasses(t *testing.T) {
	var accountID proto.AccountID

	var anotherHero proto.Hero

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestListUnlockedDeckClasses")
			require.NoError(t, err)
		}

		// Heroes
		{
			err := data.CreateStarterDecks(data.DB, accountID)
			require.NoError(t, err)

			anotherHero = proto.Hero_SAMYA
			heroItemType := proto.ItemType_SW_HERO
			tier := proto.SkypassTier_FREE
			reward := &data.SkypassReward{SkypassReward: &proto.SkypassReward{
				ItemType: &heroItemType,
				Season:   1,
				Tier:     &tier,
				Attributes: &proto.SkypassRewardAttributes{
					TokenIDs: []uint64{uint64(anotherHero)},
				},
			}}
			require.NoError(t, reward.Validate())

			rewardApplier := skypass.NewRewardApplier(nil, metrics.NewPrometheusCollector())
			_, err = rewardApplier.ApplyReward(context.Background(), data.DB.Session, accountID, reward)
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(accountID)

	deckClasses, err := apitest.Client().ListUnlockedDeckClasses(ctx)
	require.NoError(t, err)

	require.Len(t, deckClasses, 2)
	assert.Equal(t, proto.DeckClass_STR, *deckClasses[0])
	assert.Equal(t, data.HeroDeckClass(anotherHero), *deckClasses[1])
}

func TestGMResetStarterDecks(t *testing.T) {
	var accountID, adminAccountID proto.AccountID

	var address, anotherAddress proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestGMResetStarterDecks-1")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("TestGMResetStarterDecks-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMResetStarterDecks-admin")
			require.NoError(t, err)
		}

		// Decks
		{
			err := data.CreateStarterDecks(data.DB, accountID)
			require.NoError(t, err)

			deck, err := data.DB.Decks().FindOne(db.Cond{
				"account_id": accountID,
				"deck_type":  proto.DeckType_LOCKED_STARTER,
			})
			require.NoError(t, err)

			deck.DeckType = proto.DeckType_CUSTOM
			err = data.DB.Save(deck)
			require.NoError(t, err)
		}
	}

	addressString := address.String()

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		ok, err := apitest.Client().GMResetStarterDecks(ctx, "")
		require.ErrorContains(t, err, "unauthorized")
		require.False(t, ok)
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		count, err := data.DB.Decks().Find(db.Cond{
			"account_id": accountID,
			"deck_type":  db.In(proto.DeckType_UNLOCKED_STARTER, proto.DeckType_LOCKED_STARTER),
		}).Count()
		require.NoError(t, err)
		assert.Equal(t, 4, int(count))

		ok, err := apitest.Client().GMResetStarterDecks(ctx, addressString)
		require.NoError(t, err)
		require.True(t, ok)

		count, err = data.DB.Decks().Find(db.Cond{
			"account_id": accountID,
			"deck_type":  db.In(proto.DeckType_UNLOCKED_STARTER, proto.DeckType_LOCKED_STARTER),
		}).Count()
		require.NoError(t, err)
		assert.Equal(t, 5, int(count))
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		addressString := anotherAddress.String()

		ok, err := apitest.Client().GMResetStarterDecks(ctx, addressString)
		require.ErrorContains(t, err, "unauthorized")
		require.False(t, ok)
	})
}

func TestSearchDeckRanks(t *testing.T) {
	var accountID, accountID2 proto.AccountID

	var address, address2 proto.Hash

	var deckString1, deckString2 string

	var deckClass1 proto.DeckClass

	var cardID uint64

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestSearchDeckRanks-1")
			require.NoError(t, err)

			accountID2, address2, err = apitest.CreateRandomAccount("TestSearchDeckRanks-2")
			require.NoError(t, err)
		}

		// Deck ranks
		{
			err := data.DB.DeckRanks().Truncate()
			require.NoError(t, err)

			decks := data.GetStarterDecks()

			deckString1, err = deckstring.Encode(decks[0].CardIDs, decks[0].Class.String())
			require.NoError(t, err)
			deckRank1 := &data.DeckRank{DeckRank: &proto.DeckRank{
				DeckString:      deckString1,
				HighestPlayerID: accountID,
			}}
			err = data.DB.Save(deckRank1)
			require.NoError(t, err)
			deckClass1 = decks[0].Class
			cardID = decks[0].CardIDs[2]

			deckString2, err = deckstring.Encode(decks[1].CardIDs, decks[1].Class.String())
			require.NoError(t, err)
			deckRank2 := &data.DeckRank{DeckRank: &proto.DeckRank{
				DeckString:      deckString2,
				HighestPlayerID: accountID2,
			}}
			err = data.DB.Save(deckRank2)
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(accountID)

	t.Run("without parameters", func(t *testing.T) {
		_, deckRanks, err := apitest.Client().SearchDeckRanks(ctx, nil, &proto.SearchDeckRanksRequest{})
		require.NoError(t, err)
		assert.Len(t, deckRanks, 2)

		for _, deckRank := range deckRanks {
			assert.NotZero(t, deckRank.HighestPlayerID)
			assert.True(t, deckRank.HighestPlayerAddress.IsValidAddress())
		}
	})

	t.Run("with deck string", func(t *testing.T) {
		_, deckRanks, err := apitest.Client().SearchDeckRanks(ctx, nil, &proto.SearchDeckRanksRequest{
			DeckString: &deckString2,
		})
		require.NoError(t, err)
		require.Len(t, deckRanks, 1)

		deckRank := deckRanks[0]
		assert.Equal(t, deckString2, deckRank.DeckString)
		assert.Equal(t, accountID2, deckRank.HighestPlayerID)
		assert.Equal(t, address2, deckRank.HighestPlayerAddress)
	})

	t.Run("with deck class", func(t *testing.T) {
		_, deckRanks, err := apitest.Client().SearchDeckRanks(ctx, nil, &proto.SearchDeckRanksRequest{
			Classes: []*proto.DeckClass{&deckClass1},
		})
		require.NoError(t, err)
		require.Len(t, deckRanks, 1)

		deckRank := deckRanks[0]
		assert.Equal(t, deckString1, deckRank.DeckString)
		assert.Equal(t, accountID, deckRank.HighestPlayerID)
		assert.Equal(t, address, deckRank.HighestPlayerAddress)
	})

	t.Run("with cards", func(t *testing.T) {
		_, deckRanks, err := apitest.Client().SearchDeckRanks(ctx, nil, &proto.SearchDeckRanksRequest{
			WithCards: []int32{int32(cardID)},
		})
		require.NoError(t, err)
		require.Len(t, deckRanks, 1)

		deckRank := deckRanks[0]
		assert.Equal(t, deckString1, deckRank.DeckString)
		assert.Equal(t, accountID, deckRank.HighestPlayerID)
		assert.Equal(t, address, deckRank.HighestPlayerAddress)
	})
}

// Verify deckstring is equal to card list
func isDeckStringEqual(deckString string, cardIDs []uint64) bool {
	dCardIDs, _, _, err := data.DecodeDeckString(deckString)
	if err != nil {
		panic(err)
	}

	sort.Sort(data.UInt64Slice(cardIDs))
	sort.Sort(data.UInt64Slice(dCardIDs))

	if len(dCardIDs) != len(cardIDs) {
		return false
	}
	for i, v := range dCardIDs {
		if v != cardIDs[i] {
			return false
		}
	}

	return true
}
