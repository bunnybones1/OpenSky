package skypass

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/scylladb/go-set/u64set"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

type RewardApplierImpl struct {
	cardIndex        CardIndex
	metricsCollector MetricsCollector
}

func NewRewardApplier(cardIndex CardIndex, metricsCollector MetricsCollector) *RewardApplierImpl {
	return &RewardApplierImpl{
		cardIndex:        cardIndex,
		metricsCollector: metricsCollector,
	}
}

func (a *RewardApplierImpl) ApplyReward(ctx context.Context, sess db.Session, accountID proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, error) {
	var gainedRewards []*proto.Reward

	var events []*data.FeedEvent

	var err error

	switch *reward.ItemType {
	case proto.ItemType_SW_HERO:
		gainedRewards, events, err = a.applyHero(ctx, sess, accountID, reward)
		if err != nil {
			return nil, fmt.Errorf("apply hero: %w", err)
		}
	case proto.ItemType_SW_BASE_CARDS:
		gainedRewards, events, err = a.applyBaseCard(ctx, sess, accountID, reward)
		if err != nil {
			return nil, fmt.Errorf("apply base card: %w", err)
		}
	case proto.ItemType_SW_CONQUEST_TICKET:
		gainedRewards, events, err = a.applyConquestTicket(ctx, sess, accountID, reward)
		if err != nil {
			return nil, fmt.Errorf("apply conquest ticket: %w", err)
		}
	case proto.ItemType_SW_STICKERS:
		gainedRewards, events, err = a.applySticker(ctx, sess, accountID, reward)
		if err != nil {
			return nil, fmt.Errorf("apply sticker: %w", err)
		}
	case proto.ItemType_SW_STICKER_POINTS:
		gainedRewards, events, err = a.applyStickerPoints(ctx, sess, accountID, reward)
		if err != nil {
			return nil, fmt.Errorf("apply sticker points: %w", err)
		}
	case proto.ItemType_SW_SILVER_CARDS:
		gainedRewards, events, err = a.applySilverCard(ctx, sess, accountID, reward)
		if err != nil {
			return nil, fmt.Errorf("apply silver card: %w", err)
		}
	case proto.ItemType_SW_CARD_BACKS:
		gainedRewards, events, err = a.applyCardBack(ctx, sess, accountID, reward)
		if err != nil {
			return nil, fmt.Errorf("apply card back: %w", err)
		}
	case proto.ItemType_SW_TITLES:
		gainedRewards, events, err = a.applyTitle(ctx, sess, accountID, reward)
		if err != nil {
			return nil, fmt.Errorf("apply title: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported item type %q", reward.ItemType)
	}

	a.metricsCollector.TrackSkypassClaim(reward)

	for _, event := range events {
		err := sess.Save(event)
		if err != nil {
			return nil, fmt.Errorf("save feed event: %w", err)
		}
	}

	return gainedRewards, nil
}

func (a *RewardApplierImpl) applyHero(_ context.Context, sess db.Session, accountID proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, []*data.FeedEvent, error) {
	var gainedRewards, gainedHeroRewards []*proto.Reward

	var events []*data.FeedEvent

	for _, tokenID := range reward.Attributes.TokenIDs {
		hero := proto.Hero(tokenID)

		err := data.UnlockHero(sess, accountID, hero)
		if err != nil && !errors.Is(err, data.ErrHeroUnlockedAlready) {
			return nil, nil, fmt.Errorf("unlock hero: %w", err)
		}

		deckClass := data.HeroDeckClass(hero)

		gainedHeroRewards = append(gainedHeroRewards, &proto.Reward{
			AccountID: accountID,
			Type:      proto.RewardType_HERO,
			Hero: &proto.RewardHero{
				Hero:      hero,
				DeckClass: deckClass,
			},
		})

		if !data.HasStarterDeck(deckClass) {
			continue
		}

		deckEvents, deckRewards, err := data.UnlockStarterDeckByDeckClass(&data.Database{Session: sess}, accountID, deckClass)
		if err != nil {
			return nil, nil, fmt.Errorf("unlock deck: %w", err)
		}

		for _, event := range deckEvents {
			events = append(events, &data.FeedEvent{FeedEvent: event})
		}

		gainedRewards = append(gainedRewards, deckRewards...)
	}

	if len(gainedHeroRewards) > 0 {
		events = append(events, &data.FeedEvent{FeedEvent: &proto.FeedEvent{
			AccountID: accountID,
			Type:      proto.FeedEventType_HERO_UNLOCK,
		}})

		gainedRewards = append(gainedRewards, gainedHeroRewards...)
	}

	return gainedRewards, events, nil
}

func (a *RewardApplierImpl) applyBaseCard(_ context.Context, sess db.Session, accountID proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, []*data.FeedEvent, error) {
	var gainedRewards []*proto.Reward

	var events []*data.FeedEvent

	var cards []*data.Card

	amount := int(reward.Amount)

	if reward.Attributes != nil && len(reward.Attributes.TokenIDs) > 0 {
		amount = len(reward.Attributes.TokenIDs)
	}

	ownedBaseCards, ownedAllCards, err := a.getOwnedCards(sess, accountID)
	if err != nil {
		return nil, nil, fmt.Errorf("get owned cards: %w", err)
	}

	seasonInvalidCardIDs := a.cardIndex.CardIDsSeasonInvalid(reward.Season)

	ownedBaseCards.Add(seasonInvalidCardIDs...)
	ownedAllCards.Add(seasonInvalidCardIDs...)

	ownedAndExcludedSetBaseCards := ownedBaseCards.Copy()
	ownedAndExcludedSetAllCards := ownedAllCards.Copy()

	excludedCardSetCardIDs := u64set.New()

	if reward.Attributes != nil && len(reward.Attributes.CardSetsExcluded) > 0 {
		excludedCardSetCardIDs.Add(a.cardIndex.CardIDsByCardSets(reward.Attributes.CardSetsExcluded...)...)
	}

	ownedAndExcludedSetBaseCards.Add(excludedCardSetCardIDs.List()...)
	ownedAndExcludedSetAllCards.Add(excludedCardSetCardIDs.List()...)

	for i := 0; i < amount; i++ {
		var card *data.Card

		var err error

		if reward.Attributes != nil {
			if len(reward.Attributes.TokenIDs) > 0 {
				card = a.cardIndex.GetCardByID(reward.Attributes.TokenIDs[i])

				if card != nil && ownedAndExcludedSetBaseCards.Has(card.ID) {
					card = nil
				}
			} else if len(reward.Attributes.CardSets) > 0 {
				card, err = a.findRandomBaseCardFromSet(ownedAndExcludedSetBaseCards, ownedAndExcludedSetAllCards, reward.Attributes.CardSets)
				if err != nil {
					return nil, nil, fmt.Errorf("find random base card from set: %w", err)
				}
			}
		}

		if card == nil {
			card, err = a.findRandomBaseCardWithSamePrismAsLastMatch(sess, accountID, ownedAndExcludedSetBaseCards, ownedAndExcludedSetAllCards)
			if err != nil {
				return nil, nil, fmt.Errorf("find random base card: %w", err)
			}
		}

		if card == nil {
			card, err = a.findAnyRandomBaseCard(ownedAndExcludedSetBaseCards, ownedAndExcludedSetAllCards)
			if err != nil {
				return nil, nil, fmt.Errorf("find random base card: %w", err)
			}
		}

		if card == nil && excludedCardSetCardIDs.Size() > 0 {
			card, err = a.findAnyRandomBaseCard(ownedBaseCards, ownedAllCards)
			if err != nil {
				return nil, nil, fmt.Errorf("find random base card: %w", err)
			}
		}

		if card != nil {
			card.ItemType = proto.ItemType_SW_BASE_CARDS
			cards = append(cards, card)

			ownedBaseCards.Add(card.ID)
			ownedAllCards.Add(card.ID)
			ownedAndExcludedSetBaseCards.Add(card.ID)
			ownedAndExcludedSetAllCards.Add(card.ID)
		}
	}

	for _, card := range cards {
		if err := sess.Save(&data.Item{
			Item: &proto.Item{
				AccountID: accountID,
				ItemType:  proto.ItemType_SW_BASE_CARDS,
				TokenID:   card.ID,
				Balance:   prototyp.NewBigInt(1),
			},
		}); err != nil {
			return nil, nil, fmt.Errorf("save item, card ID %d: %w", card.ID, err)
		}

		gainedRewards = append(gainedRewards, &proto.Reward{
			AccountID: accountID,
			Type:      proto.RewardType_CARD,
			Card: &proto.RewardCard{
				Amount: 1,
				Card:   card.Card,
			},
		})

		events = append(events, &data.FeedEvent{
			FeedEvent: &proto.FeedEvent{
				AccountID: accountID,
				Type:      proto.FeedEventType_REWARD,
				TokenIDs:  []uint64{card.ID},
			},
		})
	}

	return gainedRewards, events, nil
}

func (a *RewardApplierImpl) applyConquestTicket(_ context.Context, sess db.Session, accountID proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, []*data.FeedEvent, error) {
	var gainedRewards []*proto.Reward

	var events []*data.FeedEvent

	amount := int64(1)

	if int64(reward.Amount) > amount {
		amount = int64(reward.Amount)
	}

	err := data.DB.Items(sess).GainConquestTickets(accountID, big.NewInt(amount), proto.TransactionType_SKYPASS, "")
	if err != nil {
		return nil, nil, fmt.Errorf("gain conquest ticket: %w", err)
	}

	gainedRewards = append(gainedRewards, &proto.Reward{
		AccountID: accountID,
		Type:      proto.RewardType_CONQUEST_TICKET,
	})

	events = append(events, &data.FeedEvent{FeedEvent: &proto.FeedEvent{
		AccountID: accountID,
		Type:      proto.FeedEventType_REWARD,
		TokenIDs:  []uint64{data.ConquestTicketTokenID},
	}})

	return gainedRewards, events, nil
}

func (a *RewardApplierImpl) applySticker(_ context.Context, sess db.Session, accountID proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, []*data.FeedEvent, error) {
	var gainedRewards []*proto.Reward

	var events []*data.FeedEvent

	if reward.Attributes == nil {
		return nil, nil, fmt.Errorf("no tokens provided")
	}

	var onChainTokenIDs []uint64

	for _, tokenID := range reward.Attributes.TokenIDs {
		onChainTokenIDs = append(onChainTokenIDs, data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_STICKERS, tokenID))
	}

	var stickers []*data.Sticker

	err := data.DB.Stickers(sess).Find(db.Cond{"token_id": db.AnyOf(onChainTokenIDs)}).All(&stickers)
	if err != nil {
		return nil, nil, fmt.Errorf("find stickers: %w", err)
	}

	if len(stickers) == 0 {
		return nil, nil, fmt.Errorf("no stickers provided")
	}

	stickerAmounts := make(map[uint64]uint64)

	for _, sticker := range stickers {
		stickerAmounts[sticker.TokenID] += jobqueue.StickerDecimalsMultiplier
	}

	err = data.DB.Tasks(sess).EnqueueTask(jobqueue.MintSkypassStickersQueue, jobqueue.MintSkypassStickersTask{
		AccountID:       accountID,
		StickerAmounts:  stickerAmounts,
		SkypassRewardID: reward.ID,
		AwardedAt:       time.Now(),
	}, nil, &accountID)
	if err != nil {
		return nil, nil, fmt.Errorf("enqueue minting stickers: %w", err)
	}

	gainedRewards = append(gainedRewards, &proto.Reward{
		AccountID: accountID,
		Type:      proto.RewardType_STICKER,
	})

	events = append(events, &data.FeedEvent{FeedEvent: &proto.FeedEvent{
		AccountID: accountID,
		Type:      proto.FeedEventType_REWARD,
		TokenIDs:  onChainTokenIDs,
	}})

	return gainedRewards, events, nil
}

func (a *RewardApplierImpl) applyStickerPoints(_ context.Context, sess db.Session, accountID proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, []*data.FeedEvent, error) {
	var gainedRewards []*proto.Reward

	var events []*data.FeedEvent

	if reward.Amount == 0 {
		return nil, nil, fmt.Errorf("no amount provided")
	}

	if err := data.DB.Items(sess).GainStickerPoints(accountID, big.NewInt(int64(reward.Amount)), proto.TransactionType_SKYPASS, ""); err != nil {
		return nil, nil, fmt.Errorf("gain sticker points: %w", err)
	}

	gainedRewards = []*proto.Reward{{
		AccountID:     accountID,
		Type:          proto.RewardType_STICKER_POINTS,
		StickerPoints: &reward.Amount,
	}}

	events = append(events, &data.FeedEvent{FeedEvent: &proto.FeedEvent{
		AccountID:     accountID,
		Type:          proto.FeedEventType_REWARD,
		StickerPoints: &reward.Amount,
	}})

	return gainedRewards, events, nil
}

func (a *RewardApplierImpl) applySilverCard(_ context.Context, sess db.Session, accountID proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, []*data.FeedEvent, error) {
	var gainedRewards []*proto.Reward

	var events []*data.FeedEvent

	var cards []*data.Card

	amount := int(reward.Amount)

	if reward.Attributes != nil && len(reward.Attributes.TokenIDs) > 0 {
		amount = len(reward.Attributes.TokenIDs)
	}

	seasonInvalidCardIDs := a.cardIndex.CardIDsSeasonInvalid(reward.Season)

	excludedCards := u64set.New(seasonInvalidCardIDs...)

	if reward.Attributes != nil && len(reward.Attributes.CardSetsExcluded) > 0 {
		excludedCards.Add(a.cardIndex.CardIDsByCardSets(reward.Attributes.CardSetsExcluded...)...)
	}

	for i := 0; i < amount; i++ {
		var card *data.Card

		if reward.Attributes != nil {
			if len(reward.Attributes.TokenIDs) > 0 {
				card = a.cardIndex.GetCardByID(reward.Attributes.TokenIDs[i])

				if card == nil {
					continue
				}
			} else if len(reward.Attributes.CardSets) > 0 {
				card = a.cardIndex.GetRandomCardByCardSets(reward.Attributes.CardSets, excludedCards.List())

				if card == nil {
					continue
				}
			}
		}

		if card == nil {
			excludeIDs := excludedCards.List()
			data.SortUInt64Slice(excludeIDs)

			card = a.cardIndex.GetRandomCard(excludeIDs)
		}

		if card != nil {
			card.ItemType = proto.ItemType_SW_SILVER_CARDS
			cards = append(cards, card)
		}
	}

	if len(cards) == 0 {
		return nil, nil, fmt.Errorf("no cards provided")
	}

	var onChainTokenIDs []uint64

	cardAmounts := make(map[uint64]uint64)

	for _, card := range cards {
		cardAmounts[*card.SilverCardTokenID] += jobqueue.SilverCardDecimalsMultiplier

		onChainTokenIDs = append(onChainTokenIDs, *card.SilverCardTokenID)
	}

	err := data.DB.Tasks(sess).EnqueueTask(jobqueue.MintSkypassSilverCardsQueue, jobqueue.MintSkypassSilverCardsTask{
		AccountID:       accountID,
		CardAmounts:     cardAmounts,
		SkypassRewardID: reward.ID,
		AwardedAt:       time.Now(),
	}, nil, &accountID)
	if err != nil {
		return nil, nil, fmt.Errorf("enqueue minting silver card rewards: %w", err)
	}

	for _, card := range cards {
		gainedRewards = append(gainedRewards, &proto.Reward{
			AccountID: accountID,
			Type:      proto.RewardType_CARD,
			Card: &proto.RewardCard{
				Amount: 1,
				Card:   card.Card,
			},
		})
	}

	events = append(events, &data.FeedEvent{FeedEvent: &proto.FeedEvent{
		AccountID: accountID,
		Type:      proto.FeedEventType_REWARD,
		TokenIDs:  onChainTokenIDs,
	}})

	return gainedRewards, events, nil
}

func (a *RewardApplierImpl) applyCardBack(_ context.Context, sess db.Session, accountID proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, []*data.FeedEvent, error) {
	var gainedRewards []*proto.Reward

	var events []*data.FeedEvent

	if reward.Attributes == nil {
		return nil, nil, fmt.Errorf("no tokens provided")
	}

	var onChainTokenIDs []uint64

	cardBackAmounts := make(map[uint64]uint64)

	for _, tokenID := range reward.Attributes.TokenIDs {
		onChainTokenID := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_CARD_BACKS, tokenID)
		onChainTokenIDs = append(onChainTokenIDs, onChainTokenID)
		cardBackAmounts[onChainTokenID] += jobqueue.CardBackDecimalsMultiplier
	}

	if len(onChainTokenIDs) == 0 {
		return nil, nil, fmt.Errorf("no card backs provided")
	}

	err := data.DB.Tasks(sess).EnqueueTask(jobqueue.MintCardBackRewardsQueue, jobqueue.MintCardBackRewardsTask{
		AccountID:       accountID,
		CardBackAmounts: cardBackAmounts,
		SkypassRewardID: reward.ID,
		AwardedAt:       time.Now(),
	}, nil, &accountID)
	if err != nil {
		return nil, nil, fmt.Errorf("enqueue minting card back rewards: %w", err)
	}

	gainedRewards = append(gainedRewards, &proto.Reward{
		AccountID: accountID,
		Type:      proto.RewardType_CARD_BACK,
	})

	events = append(events, &data.FeedEvent{FeedEvent: &proto.FeedEvent{
		AccountID: accountID,
		Type:      proto.FeedEventType_REWARD,
		TokenIDs:  onChainTokenIDs,
	}})

	return gainedRewards, events, nil
}

func (a *RewardApplierImpl) applyTitle(_ context.Context, sess db.Session, accountID proto.AccountID, reward *data.SkypassReward) ([]*proto.Reward, []*data.FeedEvent, error) {
	var gainedRewards []*proto.Reward

	var events []*data.FeedEvent

	if reward.Attributes == nil {
		return nil, nil, fmt.Errorf("no tokens provided")
	}

	var onChainTokenIDs []uint64

	for _, tokenID := range reward.Attributes.TokenIDs {
		item, err := data.DB.Items(sess).FindAccountItem(accountID, proto.ItemType_SW_TITLES, tokenID)
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			return nil, nil, fmt.Errorf("find title %d: %w", tokenID, err)
		}

		if item != nil {
			continue
		}

		onChainTokenID := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_TITLES, tokenID)

		if err := data.DB.Items(sess).GainToken(accountID, onChainTokenID, big.NewInt(1), proto.TransactionType_SKYWEAVER, ""); err != nil {
			return nil, nil, fmt.Errorf("gain title %d: %w", tokenID, err)
		}

		onChainTokenIDs = append(onChainTokenIDs, onChainTokenID)
	}

	if len(onChainTokenIDs) > 0 {
		gainedRewards = append(gainedRewards, &proto.Reward{
			AccountID: accountID,
			Type:      proto.RewardType_TITLE,
		})

		events = append(events, &data.FeedEvent{FeedEvent: &proto.FeedEvent{
			AccountID: accountID,
			Type:      proto.FeedEventType_REWARD,
			TokenIDs:  onChainTokenIDs,
		}})
	}

	return gainedRewards, events, nil
}

func (a *RewardApplierImpl) getOwnedCards(sess db.Session, accountID proto.AccountID) (baseCards, allCards *u64set.Set, err error) {
	var items []*data.Item

	err = data.DB.Items(sess).Find(db.Cond{
		"account_id": accountID,
		"item_type":  db.In(proto.ItemType_SW_BASE_CARDS, proto.ItemType_SW_SILVER_CARDS, proto.ItemType_SW_GOLD_CARDS),
		"balance":    db.Gte(1),
	}).All(&items)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, nil, fmt.Errorf("find owned cards: %w", err)
	}

	baseCardsIDs := u64set.New()
	allCardsIDs := u64set.New()

	for _, item := range items {
		if item.ItemType == proto.ItemType_SW_BASE_CARDS {
			baseCardsIDs.Add(item.TokenID)
		}

		allCardsIDs.Add(item.TokenID)
	}

	return baseCardsIDs, allCardsIDs, nil
}

func (a *RewardApplierImpl) findRandomBaseCardFromSet(baseCards, allCards *u64set.Set, cardSets []*proto.CardSet) (*data.Card, error) {
	excludeIDs := allCards.List()
	data.SortUInt64Slice(excludeIDs)

	card := a.cardIndex.GetRandomCardByCardSets(cardSets, excludeIDs)

	if card != nil && hasCardSet(card, cardSets) {
		return card, nil
	}

	excludeIDs = baseCards.List()
	data.SortUInt64Slice(excludeIDs)

	card = a.cardIndex.GetRandomCardByCardSets(cardSets, excludeIDs)

	if card != nil && hasCardSet(card, cardSets) {
		return card, nil
	}

	return nil, nil
}

func (a *RewardApplierImpl) findRandomBaseCardWithSamePrismAsLastMatch(sess db.Session, accountID proto.AccountID, baseCards, allCards *u64set.Set) (*data.Card, error) {
	var cardClasses []proto.CardClass

	var match *data.Match

	err := data.DB.Matches(sess).Find(db.And(
		db.Or(
			db.Cond{"p1_id": accountID},
			db.Cond{"p2_id": accountID},
		),
		db.Cond{"status": db.In(proto.MatchStatus_COMPLETED, proto.MatchStatus_FORFEITED)},
	)).OrderBy("-ended_at").One(&match)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find latest match: %w", err)
	}

	if match != nil {
		if match.Player1ID == accountID {
			cardClasses = match.Player1DeckClass.CardClasses()
		} else if match.Player2ID == accountID {
			cardClasses = match.Player2DeckClass.CardClasses()
		}
	}

	excludeIDs := allCards.List()
	data.SortUInt64Slice(excludeIDs)

	card := a.cardIndex.GetRandomCardByClasses(cardClasses, excludeIDs)

	if card != nil && hasCardClass(card, cardClasses) {
		return card, nil
	}

	excludeIDs = baseCards.List()
	data.SortUInt64Slice(excludeIDs)

	card = a.cardIndex.GetRandomCardByClasses(cardClasses, excludeIDs)

	if card != nil && hasCardClass(card, cardClasses) {
		return card, nil
	}

	return nil, nil
}

func (a *RewardApplierImpl) findAnyRandomBaseCard(baseCards, allCards *u64set.Set) (*data.Card, error) {
	excludeIDs := allCards.List()
	data.SortUInt64Slice(excludeIDs)

	card := a.cardIndex.GetRandomCard(excludeIDs)

	if card != nil {
		return card, nil
	}

	excludeIDs = baseCards.List()
	data.SortUInt64Slice(excludeIDs)

	card = a.cardIndex.GetRandomCard(excludeIDs)

	return card, nil
}

func hasCardClass(card *data.Card, classes []proto.CardClass) bool {
	for _, class := range classes {
		if class == card.Class {
			return true
		}
	}

	return false
}

func hasCardSet(card *data.Card, sets []*proto.CardSet) bool {
	for _, set := range sets {
		if *set == card.Set {
			return true
		}
	}

	return false
}

// CardIndex provides find and filtering cards.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/card_index.go -package mock . CardIndex
type CardIndex interface {
	GetCardByID(id uint64) *data.Card
	GetRandomCardByClasses(classes []proto.CardClass, excludeIDs []uint64) *data.Card
	GetRandomCardByCardSets(sets []*proto.CardSet, excludeIDs []uint64) *data.Card
	GetRandomCard(excludeIDs []uint64) *data.Card
	CardIDsByCardSets(cardSets ...*proto.CardSet) []uint64
	CardIDsSeasonInvalid(season uint16) []uint64
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/metrics_collector.go -package mock . MetricsCollector
type MetricsCollector interface {
	TrackSkypassClaim(*data.SkypassReward)
}
