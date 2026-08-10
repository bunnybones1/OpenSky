package analytics

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

// Tracker is interface for analytics tracking. Note, the `r *http.Request` argument is optional
// and you can pass it nil, however its recommend to pass whenever possible so it can capture
// device / country information as well with the event.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/tracker.go -package mock . Tracker

type Tracker interface {
	TrackAccountCreated(r *http.Request, accountID proto.AccountID, deviceProperties *proto.DeviceProperties) error
	// TODO add tournament ID to match end
	TrackEndMatch(r *http.Request, match *data.Match, matchEnd *proto.MatchEndRequest) error
	TrackRewardMatch(r *http.Request, rewards []*proto.Reward, matchEndRequest *proto.MatchEndRequest, match *data.Match) error
	// TODO add tournament ID to match start
	TrackStartMatch(r *http.Request, match *proto.Match, matchStartRequest *proto.MatchStartRequest) error
	TrackLevelUps(r *http.Request, accountID proto.AccountID, startLevel uint16, endLevel uint16, gamesPlayed uint32) error
	// TrackSkypassLevelUps(r *http.Request, accountID proto.AccountID, startLevel uint16, endLevel uint16, gamesPlayed uint32) error
	TrackAccountBanning(r *http.Request, accountID proto.AccountID, accountStatus proto.AccountStatus) error
	TrackTutorialEnd(r *http.Request, accountID proto.AccountID, levels []int) error
	TrackConquestPointsAwarded(r *http.Request, accountID proto.AccountID, treasureProgress *data.ConquestV2TreasureProgress, matchPoints uint64, silverCardPoints uint64, goldCardPoints uint64, heroSkinPoints uint64) error
	// TODO add date/time
	TrackItemPurchase(r *http.Request, itemPurchase *proto.AnalyticsItemPurchase) error
	TrackTreasureRewards(r *http.Request, accountID proto.AccountID, treasureProgress *data.ConquestV2TreasureProgress, usdcAmount float32) error
	// TODO add spark and weave items
	TrackSkypassRewardsClaim(r *http.Request, accountID proto.AccountID, rewards []*proto.Reward) error
	TrackTutorialStatus(r *http.Request, accountID proto.AccountID, match *data.Match) error
	// TODO add spark reward to Quest Compled Claim
	TrackCompletedQuestClaim(r *http.Request, accountID proto.AccountID, assignment *data.QuestAssignment) error
	TrackQuestCompletion(r *http.Request, accountID proto.AccountID, assignment *data.QuestAssignment) error
	TrackRerollQuest(r *http.Request, accountID proto.AccountID, assignment *data.QuestAssignment) error
	// TODO new tracking events for opensky 2.0
	// Draft:

	// dragon picks
	// card pool
	// event picks
	// card picks
	// special card picks per event
	// boon picks

	// Econ (rewards and shop)
	// PackOpen(r *http.Request, accountID proto.AccountID) error
	// PrestigeClaimed(r *http.Request, accountID proto.AccountID) error
	// PrestigeChestPurchased(r *http.Request, accountID proto.AccountID) error
	// DailyRewardClaimed(r *http.Request, accountID proto.AccountID) error
	// TournamentTicketsEarned(r *http.Request, accountID proto.AccountID) error
	// TournamentTicketsSpent(r *http.Request, accountID proto.AccountID) error
	// melting(r *http.Request, accountID proto.AccountID) error
	// crafting(r *http.Request, accountID proto.AccountID) error
}

var _ Tracker = &Analytics{}

func (a *Analytics) TrackAccountCreated(r *http.Request, accountID proto.AccountID, deviceProperties *proto.DeviceProperties) error {
	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackAccountCreated failed")
		return err
	}

	props := NewProps().
		SetAccount(account).
		SetDevice(deviceProperties)

	a.enqueueEvent(r, trackingAllowed, EventType_ACCOUNT_CREATED, account, props)

	return nil
}

func (a *Analytics) TrackEndMatch(r *http.Request, match *data.Match, matchEnd *proto.MatchEndRequest) error {
	if match == nil || match.Match == nil {
		err := errors.New("match is nil")
		a.logger.Err(err).Msgf("analytics TrackEndMatch failed")
		return err
	}

	if matchEnd == nil {
		err := errors.New("matchEnd is nil")
		a.logger.Err(err).Msgf("analytics TrackEndMatch failed")
		return err
	}

	if match.Player1ID.IsValid() {
		if err := a.trackPlayerEndMatch(r, match.Player1ID, match, matchEnd); err != nil {
			a.logger.Warn().Err(err).Msgf("analytics TrackEndMatch failed: error tracking match end event for player 1")
			return err
		}
	}

	if match.Player2ID.IsValid() {
		if err := a.trackPlayerEndMatch(r, match.Player2ID, match, matchEnd); err != nil {
			a.logger.Warn().Err(err).Msgf("analytics TrackEndMatch failed: error tracking match end event for player 1")
			return err
		}
	}

	return nil
}

func (a *Analytics) trackPlayerEndMatch(r *http.Request, accountID proto.AccountID, match *data.Match, matchEndRequest *proto.MatchEndRequest) error {
	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		return err
	}

	if match.StartedAt == nil {
		return errors.New("analytics: missing match.StartedAt")
	}
	if match.EndedAt == nil {
		return errors.New("analytics: missing match.EndedAt")
	}
	if match.WinningPlayer == nil {
		return errors.New("analytics: missing match.WinningPlayer")
	}

	duration := match.EndedAt.Sub(*match.StartedAt).Seconds()

	var playerDeckString string
	var playerInitDeckString string
	var playerSessionID string
	var opponentDeckString string
	var isWinner bool
	var playerMoveFirst bool
	var playerGameMode proto.GameMode

	switch accountID {
	case match.Player1ID:
		playerDeckString = match.Player1DeckString
		playerInitDeckString = match.InitPlayer1DeckString
		if matchEndRequest.Player1SessionId != nil {
			playerSessionID = *matchEndRequest.Player1SessionId
		}
		playerGameMode = match.Player1GameMode
		opponentDeckString = match.Player2DeckString
		isWinner = *match.WinningPlayer == 1
		playerMoveFirst = true

	case match.Player2ID:
		playerDeckString = match.Player2DeckString
		playerInitDeckString = match.InitPlayer2DeckString
		if matchEndRequest.Player2SessionId != nil {
			playerSessionID = *matchEndRequest.Player2SessionId
		}
		playerGameMode = match.Player2GameMode
		opponentDeckString = match.Player1DeckString
		isWinner = *match.WinningPlayer == 2
		playerMoveFirst = false

	default:
		return errAccountIDMismatch
	}

	playerCardIDs, playerDeckClass, playerDeckVersion, err := data.DecodeDeckString(playerDeckString)
	if err != nil {
		return fmt.Errorf("analytics: decode deckstring %q: %w", playerDeckString, err)
	}

	_, opponentDeckClass, _, err := data.DecodeDeckString(opponentDeckString)
	if err != nil {
		return fmt.Errorf("analytics: decode deckstring: %w", err)
	}

	playerDeckType, err := parseDeckType(playerInitDeckString)
	if err != nil {
		return fmt.Errorf("analytics: parse deck type %q: %w", playerInitDeckString, err)
	}

	playerCardData := []CardData{}
	for _, id := range playerCardIDs {
		card := data.CardIndex.GetCardByID(id)

		playerCardData = append(playerCardData, CardData{
			CardId:      id,
			CardName:    card.Name,
			CardType:    card.Type.String(),
			CardClass:   card.Class.String(),
			CardElement: card.Element.String(),
			CardMana:    card.ManaCost,
			CardAttack:  card.Power,
			CardHealth:  card.Health,
		})
	}

	playerCardDataJSON, err := json.Marshal(playerCardData)
	if err != nil {
		return err
	}

	props := NewProps().
		SetInteger("matchId", match.ID).
		SetStringer("prism", playerDeckClass).
		SetStringer("opponentPrism", opponentDeckClass).
		SetString("deckString", playerDeckString).
		SetString("deckVersion", playerDeckVersion).
		SetBool("moveFirst", playerMoveFirst).
		SetBool("won", isWinner).
		SetString("cards", string(playerCardDataJSON)).
		SetBool("forfeited", !isWinner && match.Status == proto.MatchStatus_FORFEITED).
		SetBool("abandoned", !isWinner && match.Status == proto.MatchStatus_ABANDONED).
		SetBool("completed", match.Status == proto.MatchStatus_COMPLETED).
		SetInteger("startedAt", match.StartedAt.Unix()).
		SetInteger("endedAt", match.EndedAt.Unix()).
		SetInteger("durationInSec", duration).
		SetInteger("turns", match.TurnNonce).
		SetStringer("mode", playerGameMode).
		SetString("sessionId", playerSessionID).
		SetStringer("deckType", playerDeckType).
		SetInteger("replayID", match.ReplayID)

	for k, v := range match.Metrics {
		props.Set(k, v)
	}

	a.enqueueEvent(r, trackingAllowed, EventType_MATCH_ENDED, account, props)

	return nil
}

func (a *Analytics) TrackRewardMatch(r *http.Request, rewards []*proto.Reward, matchEndRequest *proto.MatchEndRequest, match *data.Match) error {
	if matchEndRequest == nil {
		return errors.New("analytics: matchEndRequest is nil")
	}
	if match == nil {
		return errors.New("analytics: match is nil")
	}
	if rewards == nil {
		return nil
	}
	for _, reward := range rewards {
		if err := a.trackPlayerRewardMatch(r, reward.AccountID, reward, matchEndRequest, match); err != nil {
			a.logger.Err(err).Msg("analytics: track match reward")
			return err
		}
	}
	return nil
}

func (a *Analytics) trackPlayerRewardMatch(r *http.Request, accountID proto.AccountID, reward *proto.Reward, matchEndRequest *proto.MatchEndRequest, match *data.Match) error {
	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics trackPlayerRewardMatch failed")
		return err
	}

	if reward == nil {
		return errors.New("analytics: reward is nil")
	}

	var sessionID string

	switch accountID {
	case match.Player1ID:
		if matchEndRequest.Player1SessionId != nil {
			sessionID = *matchEndRequest.Player1SessionId
		}
	case match.Player2ID:
		if matchEndRequest.Player2SessionId != nil {
			sessionID = *matchEndRequest.Player2SessionId
		}
	default:
		return errAccountIDMismatch
	}

	props := NewProps().
		SetStringer("account", account.Address).
		SetString("sessionId", sessionID).
		SetStringer("rewardType", reward.Type).
		SetString("mode", match.Mode())

	switch reward.Type {

	case proto.RewardType_EXP:
		props = props.
			Set("reason", reward.Exp.Reason).
			Set("reasonExtraData", reward.Exp.ReasonExtraData).
			Set("amount", reward.Exp.Amount).
			Set("currentLevel", reward.Exp.CurrentLevel).
			Set("levelUpXP", reward.Exp.RequiredExp)

	case proto.RewardType_CARD:
		props = props.
			Set("rewardCardId", reward.Card.Card.ID).
			Set("amount", reward.Card.Amount)
		if reward.Card.Item != nil {
			props = props.SetStringer("cardRewardType", reward.Card.Item.ItemType)
		}

	case proto.RewardType_RANK:
		var amount int32
		if reward.Rank.AfterMatch.Rank == reward.Rank.BeforeMatch.Rank {
			amount = reward.Rank.AfterMatch.Score - reward.Rank.BeforeMatch.Score
		} else {
			amount = reward.Rank.BeforeMatch.RequiredRankPoints - reward.Rank.BeforeMatch.Score
		}
		props = props.
			SetInteger("amount", amount).
			SetStringer("currentRank", reward.Rank.AfterMatch.Rank).
			SetInteger("currentPoints", reward.Rank.AfterMatch.Score).
			SetInteger("requiredRankPoints", reward.Rank.AfterMatch.RequiredRankPoints)

	default:
		a.logger.Debug().Msgf("untrackled reward type %q", reward.Type)
		return nil
	}

	a.enqueueEvent(r, trackingAllowed, EventType_MATCH_GOT_REWARD, account, props)

	return nil
}

func (a *Analytics) TrackStartMatch(r *http.Request, match *proto.Match, matchStartRequest *proto.MatchStartRequest) error {
	if match == nil {
		return errors.New("analytics: match is nil")
	}
	if matchStartRequest == nil {
		return errors.New("analytics: matchStartRequest is nil")
	}

	if match.Player1ID.IsValid() {
		if err := a.trackPlayerStartMatch(r, match.Player1ID, match, matchStartRequest); err != nil {
			a.logger.Warn().Err(err).Msgf("error tracking match end event for player 1")
			return err
		}
	}

	if match.Player2ID.IsValid() {
		if err := a.trackPlayerStartMatch(r, match.Player2ID, match, matchStartRequest); err != nil {
			a.logger.Warn().Err(err).Msgf("error tracking match end event for player 1")
			return err
		}
	}

	return nil
}

func (a *Analytics) trackPlayerStartMatch(r *http.Request, accountID proto.AccountID, match *proto.Match, matchStartRequest *proto.MatchStartRequest) error {
	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics trackPlayerStartMatch failed")
		return err
	}

	waitTime := int64(-1)

	var playerRequestedMatchAt time.Time
	var playerDeckString string
	var playerGameMode proto.GameMode
	var sessionID string
	var playerMoveFirst bool

	switch accountID {
	case match.Player1ID:
		if matchStartRequest.Info != nil {
			playerRequestedMatchAt = matchStartRequest.Info.Player1RequestedAt
			playerGameMode = *matchStartRequest.Info.Player1GameMode
		}
		playerDeckString = match.InitPlayer1DeckString
		if matchStartRequest.Player1 != nil && matchStartRequest.Player1.PlayerSessionId != nil {
			sessionID = *matchStartRequest.Player1.PlayerSessionId
		}
		playerMoveFirst = true
	case match.Player2ID:
		if matchStartRequest.Info != nil {
			playerRequestedMatchAt = matchStartRequest.Info.Player2RequestedAt
			playerGameMode = *matchStartRequest.Info.Player2GameMode
		}
		playerDeckString = match.InitPlayer2DeckString
		if matchStartRequest.Player2 != nil && matchStartRequest.Player2.PlayerSessionId != nil {
			sessionID = *matchStartRequest.Player2.PlayerSessionId
		}
		playerMoveFirst = false
	default:
		return errAccountIDMismatch
	}

	if matchStartRequest.Info != nil {
		waitTime = matchStartRequest.Info.MatchedAt.Unix() - playerRequestedMatchAt.Unix()
	}

	_, deckClass, version, err := data.DecodeDeckString(playerDeckString)
	if err != nil {
		return err
	}

	deckType, err := parseDeckType(playerDeckString)
	if err != nil {
		return err
	}

	props := NewProps().
		SetString("deckString", playerDeckString).
		SetString("deckVersion", version).
		SetStringer("prism", deckClass).
		SetInteger("matchId", match.ID).
		SetBool("moveFirst", playerMoveFirst).
		SetStringer("mode", playerGameMode).
		SetInteger("waitTime", waitTime).
		SetString("sessionId", sessionID).
		SetStringer("deckType", deckType)

	if match.StartedAt != nil {
		props = props.SetInteger("startedAt", match.StartedAt.Unix())
	}

	a.enqueueEvent(r, trackingAllowed, EventType_MATCH_STARTED, account, props)

	return nil
}

func (a *Analytics) TrackLevelUps(r *http.Request, accountID proto.AccountID, startLevel uint16, endLevel uint16, gamesPlayed uint32) error {
	if startLevel < 1 || endLevel < 1 {
		return errors.New("levels must be greater than or equal to 1")
	}

	switch {
	case startLevel > endLevel:
		return fmt.Errorf("startLevel is greater than endLevel")
	case startLevel == endLevel:
		// no changes in level
		return nil
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackLevelUps failed")
		return err
	}

	for level := startLevel + 1; level <= endLevel; level++ {
		props := NewProps().
			SetInteger("level", level).
			SetInteger("gamesPlayed", gamesPlayed)

		a.enqueueEvent(r, trackingAllowed, EventType_ACCOUNT_LEVELED_UP, account, props)
	}

	return nil
}

func (a *Analytics) TrackAccountBanning(r *http.Request, accountID proto.AccountID, accountStatus proto.AccountStatus) error {
	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackAccountBanning failed")
		return err
	}

	props := NewProps().
		Set("accountStatus", accountStatus).
		SetStringer("accountAddress", account.Address)

	a.enqueueEvent(r, trackingAllowed, EventType_ACCOUNT_STATUS_UPDATED, account, props)

	return nil
}

func (a *Analytics) TrackTutorialEnd(r *http.Request, accountID proto.AccountID, levels []int) error {
	if len(levels) < 1 {
		return errors.New("no levels provided")
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackTutorialEnd failed")
		return err
	}

	props := NewProps().
		SetInteger("tutorialLevel", levels[len(levels)-1]).
		SetBool("completed", true).
		Set("completedTutorials", levels)

	a.enqueueEvent(r, trackingAllowed, EventType_TUTORIAL_ENDED, account, props)

	return nil
}

func (a *Analytics) TrackConquestPointsAwarded(r *http.Request, accountID proto.AccountID, treasureProgress *data.ConquestV2TreasureProgress, matchPoints uint64, silverCardPoints uint64, goldCardPoints uint64, heroSkinPoints uint64) error {
	if treasureProgress == nil || treasureProgress.ConquestV2TreasureProgress == nil {
		return errors.New("analytics: treasureProgress is nil")
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackConquestPointsAwarded failed")
		return err
	}

	earnedPoints := matchPoints + silverCardPoints + goldCardPoints + heroSkinPoints

	props := NewProps().
		SetInteger("treasureLevel", treasureProgress.TreasureLevel).
		SetInteger("totalMatchPoints", earnedPoints).
		SetInteger("participationPoints", matchPoints).
		SetInteger("silverCardPoints", silverCardPoints).
		SetInteger("goldCardPoints", goldCardPoints).
		SetInteger("heroSkinPoints", heroSkinPoints)

	a.enqueueEvent(r, trackingAllowed, EventType_GOT_CONQUEST_POINTS, account, props)

	return nil
}

func (a *Analytics) TrackItemPurchase(r *http.Request, itemPurchase *proto.AnalyticsItemPurchase) error {
	if itemPurchase == nil {
		return errors.New("analytics: itemPurchase is nil")
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(itemPurchase.AccountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackItemPurchase failed")
		return err
	}

	var props Props

	var eventType EventType

	switch itemPurchase.ItemType {
	case proto.ItemType_SW_CONQUEST_TICKET:
		props = NewProps().
			Set("platform", itemPurchase.Platform).
			Set("quantity", itemPurchase.Quantity).
			Set("transactionId", itemPurchase.TransactionID).
			Set("purchaseType", itemPurchase.Token).
			Set("totalPrice", itemPurchase.TotalPrice).
			Set("currency", itemPurchase.Currency).
			Set("pricePerUnit", itemPurchase.PricePerUnit)
		eventType = EventType_CONQUEST_TICKET_MINTED

	case proto.ItemType_SW_SKYPASS:
		props = NewProps().
			Set("productID", itemPurchase.ProductID).
			Set("currency", itemPurchase.Currency).
			Set("pricePerUnit", itemPurchase.PricePerUnit).
			Set("quantity", itemPurchase.Quantity).
			Set("totalPrice", itemPurchase.TotalPrice).
			Set("season", data.CurrentSeason()).
			Set("platform", itemPurchase.Platform)
		eventType = EventType_SKYPASS_PURCHASED

	default:
		return fmt.Errorf("unsupported item for tracking purchase event: %q", itemPurchase.ItemType)
	}

	a.enqueueEvent(r, trackingAllowed, eventType, account, props)

	return nil
}

func (a *Analytics) TrackTreasureRewards(r *http.Request, accountID proto.AccountID, treasureProgress *data.ConquestV2TreasureProgress, usdcAmount float32) error {
	if treasureProgress == nil || treasureProgress.ConquestV2TreasureProgress == nil {
		return errors.New("treasureProgress is nil")
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackTreasureRewards failed")
		return err
	}

	props := NewProps().
		SetInteger("treasureLevel", treasureProgress.TreasureLevel).
		SetInteger("treasurePoints", treasureProgress.TreasurePoints).
		SetNumeric("usdcReward", usdcAmount)

	a.enqueueEvent(r, trackingAllowed, EventType_GOT_TREASURE_REWARD, account, props)

	return nil
}

func (a *Analytics) TrackSkypassRewardsClaim(r *http.Request, accountID proto.AccountID, rewards []*proto.Reward) error {
	if rewards == nil {
		return nil
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackSkypassRewardsClaim failed")
		return err
	}

	rewardsData := []RewardData{}
	for _, reward := range rewards {
		if reward == nil {
			return errors.New("missing reward")
		}

		rewardData := RewardData{
			Type: reward.Type,
		}

		if reward.GameMode != nil {
			rewardData.GameMode = *reward.GameMode
		}

		if reward.Deck != nil {
			deckData := DeckData{
				Prism: reward.Deck.DeckClass,
				Cards: GetCardsData(reward.Deck.TokenIds),
			}

			rewardData.Deck = &deckData
		}

		if reward.Card != nil {
			if reward.Card.Item != nil {
				itemData := ItemData{
					TokenID: reward.Card.Item.TokenID,
					Type:    reward.Card.Item.ItemType,
				}
				rewardData.Item = &itemData
			}
			if reward.Card.Card != nil {
				cardData := GetCardData(reward.Card.Card.ID)
				rewardData.Card = &cardData
			}
		}

		if reward.Hero != nil {
			rewardData.Hero = &HeroData{
				Hero:  reward.Hero.Hero,
				Prism: reward.Hero.DeckClass,
			}
		}

		if reward.HeroSkin != nil {
			rewardData.HeroSkin = &HeroSkinData{
				Hero:    reward.HeroSkin.Hero,
				Prism:   reward.HeroSkin.DeckClass,
				TokenID: reward.HeroSkin.TokenId,
			}
		}

		rewardsData = append(rewardsData, rewardData)
	}

	rewardsJSON, err := json.Marshal(rewardsData)
	if err != nil {
		a.logger.Err(err).Msg("encode rewards JSON")
		return err
	}

	props := NewProps().
		SetJSON("rewards", rewardsJSON)

	a.enqueueEvent(r, trackingAllowed, EventType_SKYPASS_REWARD_CLAIMED, account, props)

	return nil
}

func (a *Analytics) TrackTutorialStatus(r *http.Request, accountID proto.AccountID, match *data.Match) error {
	if match == nil || match.Match == nil {
		return errors.New("missing match")
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackTutorialStatus failed")
		return err
	}

	props := NewProps().
		SetInteger("tutorialLevel", match.TutorialLevel).
		SetInteger("turnNonce", match.TurnNonce).
		SetStringer("status", match.Status).
		SetInteger("winningPlayer", match.WinningPlayer)

	a.enqueueEvent(r, trackingAllowed, EventType_TUTORIAL_STATUS_UPDATED, account, props)

	return nil
}

func (a *Analytics) TrackCompletedQuestClaim(r *http.Request, accountID proto.AccountID, assignment *data.QuestAssignment) error {
	if assignment == nil {
		return errors.New("missing assignment")
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackCompletedQuestClaim failed")
		return err
	}

	props := NewProps().
		SetStringer("type", assignment.QuestType).
		SetStringer("periodicity", assignment.Periodicity).
		SetInteger("reRolls", assignment.ReRolls).
		SetStringer("status", assignment.Status).
		SetInteger("period", assignment.Period).
		SetInteger("position", assignment.Position.Uint16())

	a.enqueueEvent(r, trackingAllowed, EventType_QUEST_COMPLETION_CLAIMED, account, props)

	return nil
}

func (a *Analytics) TrackQuestCompletion(r *http.Request, accountID proto.AccountID, assignment *data.QuestAssignment) error {
	if assignment == nil {
		return errors.New("missing assignment")
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackQuestCompletion failed")
		return err
	}

	props := NewProps().
		SetStringer("type", assignment.QuestType).
		SetStringer("periodicity", assignment.Periodicity).
		SetInteger("reRolls", assignment.ReRolls).
		SetStringer("status", assignment.Status).
		SetInteger("period", assignment.Period).
		SetInteger("position", assignment.Position.Uint16())

	a.enqueueEvent(r, trackingAllowed, EventType_QUEST_COMPLETED, account, props)

	return nil
}

func (a *Analytics) TrackRerollQuest(r *http.Request, accountID proto.AccountID, assignment *data.QuestAssignment) error {
	if assignment == nil {
		return errors.New("missing assignment")
	}

	account, trackingAllowed, err := a.policyChecker.GetAnalyticsPolicyByAccountID(accountID)
	if err != nil {
		a.logger.Err(err).Msg("analytics TrackRerollQuest failed")
		return err
	}

	props := NewProps().
		SetStringer("type", assignment.QuestType).
		SetStringer("periodicity", assignment.Periodicity).
		SetInteger("reRolls", assignment.ReRolls).
		SetStringer("status", assignment.Status).
		SetInteger("period", assignment.Period).
		SetInteger("position", assignment.Position.Uint16())

	a.enqueueEvent(r, trackingAllowed, EventType_QUEST_REROLLED, account, props)

	return nil
}
