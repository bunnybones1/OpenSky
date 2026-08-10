package data_test

import (
	"fmt"
	"testing"

	"github.com/scylladb/go-set/u64set"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestCardIndex(t *testing.T) {
	cards := []data.Card{
		{Card: &proto.Card{
			ID:       1,
			Name:     "card-index-test-1",
			Keywords: []string{},
			Class:    proto.CardClass_STR,
			Set:      proto.CardSet_CORE_SET,
		}},
		{Card: &proto.Card{
			ID:       2,
			Name:     "card-index-test-2",
			Keywords: []string{},
			Class:    proto.CardClass_INT,
			Set:      proto.CardSet_HEXBOUND_INVASION,
		}},
	}

	cardIndex := data.NewCardIndex()
	cardIndex.LoadCards(cards)

	t.Run("get random card", func(t *testing.T) {
		t.Run("without exclusion", func(t *testing.T) {
			card := cardIndex.GetRandomCard(nil)
			require.NotNil(t, card)
		})

		t.Run("with exclusion", func(t *testing.T) {
			cardIDs := cardIndex.AllCardIDs()
			cardID := cardIDs[0]

			card := cardIndex.GetRandomCard(cardIDs[1:])
			require.NotNil(t, card)
			assert.Equal(t, cardID, card.ID)
		})

		t.Run("returns nil when none found", func(t *testing.T) {
			cardIDs := cardIndex.AllCardIDs()

			card := cardIndex.GetRandomCard(cardIDs)
			require.Nil(t, card)
		})

		t.Run("does not return card from future season", func(t *testing.T) {
			season := data.CurrentSeason()

			cardIndex := data.NewCardIndex()
			cardIndex.LoadCards([]data.Card{
				{Card: &proto.Card{
					ID:              1,
					ValidFromSeason: season + 1,
				}},
			})

			card := cardIndex.GetRandomCard(nil)
			require.Nil(t, card)
		})
	})

	t.Run("get random card from list", func(t *testing.T) {
		card1 := cardIndex.GetRandomCard(nil)
		card2 := cardIndex.GetRandomCard([]uint64{card1.ID})

		t.Run("without exclusion", func(t *testing.T) {
			list := u64set.New(card1.ID)

			card := cardIndex.GetRandomCardFromList(list, nil)
			require.NotNil(t, card)

			assert.Equal(t, card1, card)
		})

		t.Run("with exclusion", func(t *testing.T) {
			list := u64set.New(card1.ID, card2.ID)

			card := cardIndex.GetRandomCardFromList(list, []uint64{card1.ID})
			require.NotNil(t, card)

			assert.Equal(t, card2, card)
		})

		t.Run("returns card outside of the list when all in the list are excluded", func(t *testing.T) {
			card := cardIndex.GetRandomCardFromList(u64set.New(cards[0].ID), []uint64{cards[0].ID})
			require.NotNil(t, card)

			assert.Equal(t, cards[1].ID, card.ID)
		})

		t.Run("does not return card from future season", func(t *testing.T) {
			season := data.CurrentSeason()

			cards := []data.Card{
				{Card: &proto.Card{
					ID:              1,
					ValidFromSeason: season + 1,
				}},
			}

			cardIndex := data.NewCardIndex()
			cardIndex.LoadCards(cards)

			card := cardIndex.GetRandomCardFromList(u64set.New(cards[0].ID), nil)
			require.Nil(t, card)
		})
	})

	t.Run("get random card by classes", func(t *testing.T) {
		class := cardIndex.GetRandomCard(nil).Class

		t.Run("without exclusion", func(t *testing.T) {
			card := cardIndex.GetRandomCardByClasses([]proto.CardClass{class}, nil)
			require.NotNil(t, card)

			assert.Equal(t, class, card.Class)
		})

		t.Run("with exclusion", func(t *testing.T) {
			cardIDs := cardIndex.CardIDsByClasses(class)
			cardID := cardIDs[0]

			card := cardIndex.GetRandomCardByClasses([]proto.CardClass{class}, cardIDs[1:])
			require.NotNil(t, card)

			assert.Equal(t, class, card.Class)
			assert.Equal(t, cardID, card.ID)
		})

		t.Run("returns card outside of the class when all in the class are excluded", func(t *testing.T) {
			cardIDs := cardIndex.CardIDsByClasses(class)

			card := cardIndex.GetRandomCardByClasses([]proto.CardClass{class}, cardIDs)
			require.NotNil(t, card)

			assert.NotEqual(t, class, card.Class)
		})

		t.Run("does not return card from future season", func(t *testing.T) {
			season := data.CurrentSeason()

			cards := []data.Card{
				{Card: &proto.Card{
					ID:              1,
					ValidFromSeason: season + 1,
					Class:           class,
				}},
			}

			cardIndex := data.NewCardIndex()
			cardIndex.LoadCards(cards)

			card := cardIndex.GetRandomCardByClasses([]proto.CardClass{class}, nil)
			require.Nil(t, card)
		})
	})

	t.Run("get random card by card set", func(t *testing.T) {
		cardSet := cardIndex.GetRandomCard(nil).Set

		t.Run("without exclusion", func(t *testing.T) {
			card := cardIndex.GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, nil)
			require.NotNil(t, card)

			assert.Equal(t, cardSet, card.Set)
		})

		t.Run("with exclusion", func(t *testing.T) {
			cardIDs := cardIndex.CardIDsByCardSets(&cardSet)
			cardID := cardIDs[0]

			card := cardIndex.GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, cardIDs[1:])
			require.NotNil(t, card)

			assert.Equal(t, cardSet, card.Set)
			assert.Equal(t, cardID, card.ID)
		})

		t.Run("returns card outside of the set when all in the set are excluded", func(t *testing.T) {
			cardIDs := cardIndex.CardIDsByCardSets(&cardSet)

			card := cardIndex.GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, cardIDs)
			require.NotNil(t, card)

			assert.NotEqual(t, cardSet, card.Set)
		})

		t.Run("does not return card from future season", func(t *testing.T) {
			season := data.CurrentSeason()

			cards := []data.Card{
				{Card: &proto.Card{
					ID:              1,
					ValidFromSeason: season + 1,
					Set:             cardSet,
				}},
			}

			cardIndex := data.NewCardIndex()
			cardIndex.LoadCards(cards)

			card := cardIndex.GetRandomCardByCardSets([]*proto.CardSet{&cardSet}, nil)
			require.Nil(t, card)
		})
	})

	t.Run("get IDs of season invalid cards", func(t *testing.T) {
		season := data.CurrentSeason()

		cards := []data.Card{
			{Card: &proto.Card{
				ID:              1,
				ValidFromSeason: season,
			}},
			{Card: &proto.Card{
				ID:              2,
				ValidFromSeason: season + 1,
			}},
		}

		cardIndex := data.NewCardIndex()
		cardIndex.LoadCards(cards)

		ids := cardIndex.CardIDsSeasonInvalid(season)
		require.NotEmpty(t, ids)
		assert.NotContains(t, ids, cards[0].ID)
		assert.Contains(t, ids, cards[1].ID)
	})

	t.Run("set image basel URL", func(t *testing.T) {
		cardImageURL := cardIndex.GetImageURL(1)
		assert.Equal(t, "/full-cards/en/2x/1.webp", cardImageURL.Small)
		assert.Equal(t, "/full-cards/en/4x/1.webp", cardImageURL.Medium)
		assert.Equal(t, "/full-cards/en/6x/1.webp", cardImageURL.Large)

		t.Run("uses path from config when it is not empty for", func(t *testing.T) {
			modes := []config.Mode{
				config.ProductionMode,
				config.StagingMode,
				config.DevelopmentMode,
				config.Mode(10),
			}

			for _, mode := range modes {
				t.Run(fmt.Sprintf("mode %q", mode), func(t *testing.T) {
					cfg := &config.Config{
						Mode: mode,
						OpenSky: config.OpenSkyConfig{
							ImageBaseURL: "foo",
						},
					}

					cardIndex := data.NewCardIndex()
					cardIndex.SetImageBaseURL(cfg)

					cardImageURL := cardIndex.GetImageURL(1)
					assert.Equal(t, "foo/full-cards/en/2x/1.webp", cardImageURL.Small)
					assert.Equal(t, "foo/full-cards/en/4x/1.webp", cardImageURL.Medium)
					assert.Equal(t, "foo/full-cards/en/6x/1.webp", cardImageURL.Large)
				})
			}
		})

		t.Run("uses production assets when config is empty for known mode", func(t *testing.T) {
			modes := []config.Mode{
				config.ProductionMode,
				config.StagingMode,
				config.DevelopmentMode,
			}

			for _, mode := range modes {
				t.Run(mode.String(), func(t *testing.T) {
					cfg := &config.Config{
						Mode: mode,
					}

					cardIndex := data.NewCardIndex()
					cardIndex.SetImageBaseURL(cfg)

					cardImageURL := cardIndex.GetImageURL(1)
					assert.Equal(t, "https://assets.skyweaver.net/latest/full-cards/en/2x/1.webp", cardImageURL.Small)
					assert.Equal(t, "https://assets.skyweaver.net/latest/full-cards/en/4x/1.webp", cardImageURL.Medium)
					assert.Equal(t, "https://assets.skyweaver.net/latest/full-cards/en/6x/1.webp", cardImageURL.Large)
				})
			}
		})

		t.Run("uses local assets when it is not empty for unknown mode", func(t *testing.T) {
			mode := config.Mode(10)

			cfg := &config.Config{
				Mode: mode,
			}

			cardIndex := data.NewCardIndex()
			cardIndex.SetImageBaseURL(cfg)

			cardImageURL := cardIndex.GetImageURL(1)
			assert.Equal(t, "http://localhost:4001/full-cards/en/2x/1.webp", cardImageURL.Small)
			assert.Equal(t, "http://localhost:4001/full-cards/en/4x/1.webp", cardImageURL.Medium)
			assert.Equal(t, "http://localhost:4001/full-cards/en/6x/1.webp", cardImageURL.Large)
		})
	})
}
