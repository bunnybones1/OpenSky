package rpc

import (
	"context"
	"errors"
	"math/big"
	"math/rand"
	"time"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

var itemsSupplyTokenLimit = 50

func (s *Server) GetItemSummary(ctx context.Context, accountAddress string, contractQuery *bool) (map[string]*proto.ItemSummary, error) {
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, &accountAddress)
	if err != nil {
		return nil, err
	}

	account, err := data.DB.Accounts(repo).FindByID(accountID)
	if err != nil {
		return nil, proto.ErrorInternal("cannot find account")
	}

	usdcBalance, err := s.ContractUSDC.CallBalanceOf(ctx, account.Address)
	if err != nil {
		return nil, proto.WrapFailf(err, "getting USDC balance failed")
	}

	itemSummariesMap := map[string]*proto.ItemSummary{}

	var itemTypes []proto.ItemType

	// Silver Dust --- TODO : Deprecate
	itemTypes = append(itemTypes, proto.ItemType_SW_SILVER_DUST)

	// Silver Cards
	itemTypes = append(itemTypes, proto.ItemType_SW_SILVER_CARDS)

	// Gold Cards
	itemTypes = append(itemTypes, proto.ItemType_SW_GOLD_CARDS)

	// Conquest tickets
	itemTypes = append(itemTypes, proto.ItemType_SW_CONQUEST_TICKET)

	// Crystals
	itemTypes = append(itemTypes, proto.ItemType_SW_CRYSTALS)

	// Stickers
	itemTypes = append(itemTypes, proto.ItemType_SW_STICKERS)

	// Hero skins
	itemTypes = append(itemTypes, proto.ItemType_SW_HERO_SKINS)

	// Card backs
	itemTypes = append(itemTypes, proto.ItemType_SW_CARD_BACKS)

	var itemSummaries []*data.ItemSummary
	err = repo.ItemSummaries().Find(db.Cond{
		"account_id": accountID,
		"item_type":  itemTypes,
	}).OrderBy("item_type").All(&itemSummaries)

	if err != nil && err != db.ErrNoMoreRows {
		return nil, proto.WrapFailf(err, "db query failed")
	}

	for _, itemSummary := range itemSummaries {
		itemSummariesMap[itemSummary.ItemType.String()] = itemSummary.ItemSummary
	}

	now := data.TimeNowUTCPtr()
	itemSummariesMap[proto.ItemType_USDC.String()] = &proto.ItemSummary{
		ItemType:     proto.ItemType_USDC,
		TotalBalance: prototyp.ToBigInt(usdcBalance),
		UpdatedAt:    now,
		CreatedAt:    now,
	}

	return itemSummariesMap, nil
}

func (s *Server) GetItemSupply(ctx context.Context, itemID uint64) (map[string]*proto.Item, error) {
	itemsMap, err := s.GetBatchItemSupply(ctx, []uint64{itemID})
	if err != nil {
		return nil, err
	}

	return itemsMap[itemID], nil
}

func (s *Server) GetBatchItemSupply(ctx context.Context, tokenIDs []uint64) (map[uint64]map[string]*proto.Item, error) {
	repo := rctx.DBContext(ctx)

	if len(tokenIDs) > itemsSupplyTokenLimit {
		return nil, proto.ErrorInvalidArgument("tokens", "exceed the limit")
	}

	itemsMap := map[uint64]map[string]*proto.Item{}
	itemTypes := []proto.ItemType{}

	// Silver Cards
	itemTypes = append(itemTypes, proto.ItemType_SW_SILVER_CARDS)

	// Gold Cards
	itemTypes = append(itemTypes, proto.ItemType_SW_GOLD_CARDS)

	// Crystals
	itemTypes = append(itemTypes, proto.ItemType_SW_CRYSTALS)

	// Stickers
	itemTypes = append(itemTypes, proto.ItemType_SW_STICKERS)

	// Hero skins
	itemTypes = append(itemTypes, proto.ItemType_SW_HERO_SKINS)

	// Card backs
	itemTypes = append(itemTypes, proto.ItemType_SW_CARD_BACKS)

	var items []*data.Item
	err := repo.Items().Find(db.Cond{
		"account_address":  "",
		"contract_address": db.IsNotNull(),
		"token_id":         db.AnyOf(tokenIDs),
		"item_type":        itemTypes,
	}).All(&items)

	if err != nil && err != db.ErrNoMoreRows {
		return nil, proto.WrapFailf(err, "db query failed")
	}

	for _, item := range items {
		if _, ok := itemsMap[item.TokenID]; !ok {
			itemsMap[item.TokenID] = map[string]*proto.Item{}
		}

		itemsMap[item.TokenID][item.ItemType.String()] = item.Item
	}

	return itemsMap, nil
}

func (s *Server) GetItemSuppliesByType(ctx context.Context, itemTypes []*proto.ItemType) (map[uint][]*proto.ItemSupply, error) {
	repo := rctx.DBContext(ctx)

	if len(itemTypes) == 0 {
		return nil, proto.ErrorInvalidArgument("itemTypes", "cannot be empty")
	}

	itemsSupplyMap := map[uint][]*proto.ItemSupply{}

	var items []*data.Item
	err := repo.Items().Find(db.Cond{
		"account_address":  "",
		"contract_address": db.IsNotNull(),
		"item_type":        itemTypes,
	}).All(&items)
	if err != nil && err != db.ErrNoMoreRows {
		return nil, proto.WrapFailf(err, "db query failed")
	}

	for _, item := range items {
		index := uint(item.ItemType)

		if _, ok := itemsSupplyMap[index]; !ok {
			itemsSupplyMap[index] = []*proto.ItemSupply{}
		}

		itemsSupplyMap[index] = append(itemsSupplyMap[index], data.NewItemSupplyFromItem(item).ItemSupply)
	}

	return itemsSupplyMap, nil
}

func (s *Server) GetItemOwnershipByType(ctx context.Context, accountAddress *string, itemTypes []*proto.ItemType) ([]*proto.Item, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	var accountID proto.AccountID

	if account, _ := rctx.CurrentAccount(ctx); account != nil {
		accountID = account.ID
	}
	if accountAddress != nil {
		account, err := data.DB.Accounts(repo).FindByAddress(proto.HashFromString(*accountAddress))
		if err != nil {
			logger.Err(err).Msgf("find account %s", *accountAddress)
			return nil, proto.ErrorInternal("find account failed")
		}

		accountID = account.ID
	}

	if !accountID.IsValid() {
		return nil, proto.ErrorInvalidArgument("accountAddress", "is invalid")
	}

	cond := db.Cond{
		"account_id": accountID,
		"balance":    db.Gt(0),
	}

	if len(itemTypes) > 0 {
		cond["item_type"] = db.AnyOf(itemTypes)
	}

	var balances []*proto.Item
	err := repo.Items().Find(cond).All(&balances)
	if err != nil {
		return nil, err
	}

	return balances, nil
}

func (s *Server) MarkItemsNotNew(ctx context.Context, tokenIDs []uint64, immediately *bool) (bool, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	if len(tokenIDs) == 0 {
		return true, nil
	}

	updateMap := make(map[proto.ItemType][]uint64)
	for _, tokenID := range tokenIDs {
		itemType, id, err := data.SWTokenID2TypeAndItemID(tokenID)
		if err != nil {
			return false, proto.ErrorInvalidArgument("tokenIDs", "Invalid card/token ID")
		}

		if _, ok := updateMap[itemType]; !ok {
			updateMap[itemType] = make([]uint64, 0)
		}
		updateMap[itemType] = append(updateMap[itemType], id)
	}

	if immediately != nil && *immediately {
		for itemType, ids := range updateMap {
			if err := data.DB.Items(repo).MarkNotNew(account.ID, itemType, ids...); err != nil {
				oplog.Err(err).Msg("mark items as not new")

				return false, proto.ErrorInternal("failed updating item status")
			}
		}

		return true, nil
	}

	inTime := time.Now().UTC().Add(5 * time.Minute)
	err := data.DB.Tasks(repo).EnqueueTaskIgnoringDuplicates(jobqueue.MarkNotNewWorkGroup, jobqueue.MarkNotNewTask{
		AccountID: account.ID,
		TokenIDs:  tokenIDs,
	}, &inTime, &account.ID)
	if err != nil {
		return false, proto.ErrorInternal("failed updating item status")
	}

	return true, nil
}

func (s *Server) EquipItem(ctx context.Context, itemType *proto.ItemType, tokenID uint64) (*proto.Item, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	if itemType == nil {
		logger.Error().Msg("equip item: item type is nil")
		return nil, proto.ErrorInvalidArgument("item type", "is nil")
	}

	item, err := data.DB.Items(repo).FindAccountItem(account.ID, *itemType, tokenID)
	if err != nil {
		logger.Err(err).Msg("equip item")

		if errors.Is(err, db.ErrNoMoreRows) {
			return nil, proto.ErrorNotFound("item is not owned")
		}

		return nil, proto.ErrorInternal("find item")
	}

	if item == nil {
		return nil, proto.ErrorNotFound("item is not owned")
	}

	if err := data.DB.ItemsEquipped(repo).Equip(item); err != nil {
		logger.Err(err).Msgf("equip item, item type: %s, token ID: %d", itemType, tokenID)
		return nil, proto.ErrorInternal("equip item")
	}

	return item.Item, nil
}

func (s *Server) UnequipItem(ctx context.Context, itemType *proto.ItemType, tokenID uint64) (bool, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	if itemType == nil {
		logger.Error().Msg("unequip item: item type is nil")
		return false, proto.ErrorInvalidArgument("item type", "is nil")
	}

	item, err := data.DB.Items(repo).FindAccountItem(account.ID, *itemType, tokenID)
	if err != nil {
		logger.Err(err).Msg("unequip item")

		if errors.Is(err, db.ErrNoMoreRows) {
			return false, proto.ErrorNotFound("item is not owned")
		}

		return false, proto.ErrorInternal("find item")
	}

	if item == nil {
		return false, proto.ErrorNotFound("item is not owned")
	}

	if err := data.DB.ItemsEquipped(repo).Unequip(item); err != nil {
		logger.Err(err).Msgf("unequip item, item type: %s, token ID: %d", itemType, tokenID)
		return false, proto.ErrorInternal("unequip item")
	}

	return true, nil
}

func (s *Server) ListEquippedItems(ctx context.Context, itemType *proto.ItemType) ([]*proto.Item, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	itemsEquipped, err := data.DB.ItemsEquipped(repo).List(account.ID, itemType)
	if err != nil {
		logger.Err(err).Msgf("find equipped items")
		return nil, proto.ErrorInternal("find equipped items")
	}

	var itemsProto []*proto.Item

	var itemIDs []uint64

	for _, itemEquipped := range itemsEquipped {
		itemIDs = append(itemIDs, itemEquipped.ItemID)
	}

	if len(itemIDs) > 0 {
		var items []*data.Item

		if err := data.DB.Items(repo).Find(db.Cond{"id": db.AnyOf(itemIDs)}).All(&items); err != nil {
			logger.Err(err).Msgf("find items")
			return nil, proto.ErrorInternal("find items")
		}

		for _, item := range items {
			itemsProto = append(itemsProto, item.Item)
		}
	}

	return itemsProto, nil
}

func (s *Server) GetDeckEquipmentByDeckString(ctx context.Context, accountAddress *string, deckString string) (*proto.DeckEquipment, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, accountAddress)
	if err != nil {
		return nil, err
	}

	itemsEquipped, err := data.DB.ItemsEquipped(repo).List(accountID, nil)
	if err != nil {
		logger.Err(err).Msgf("find equipped items")
		return nil, proto.ErrorInternal("find equipped items")
	}

	deckEquipment := &proto.DeckEquipment{}

	var cardBacks []*data.ItemEquipped

	for _, itemEquipped := range itemsEquipped {
		switch itemEquipped.ItemType {
		case proto.ItemType_SW_STICKERS:
			deckEquipment.Stickers = append(deckEquipment.Stickers, itemEquipped.TokenID)
		case proto.ItemType_SW_CARD_BACKS:
			cardBacks = append(cardBacks, itemEquipped)
		}
	}

	if len(cardBacks) > 0 {
		cardBackTokenID := cardBacks[rand.Intn(len(cardBacks))].TokenID
		deckEquipment.CardBack = &cardBackTokenID
	}

	hasHeroSkin, err := s.HeroSkinFinder.HasFromDeckString(ctx, accountID, deckString)
	if err != nil {
		logger.Err(err).Msgf("find hero skin")
		return nil, proto.ErrorInternal("find equipped items")
	}

	if hasHeroSkin {
		_, deckClass, _, err := data.DecodeDeckString(deckString)
		if err != nil {
			logger.Err(err).Msgf("decode deck string")
			return nil, proto.ErrorInternal("find equipped items")
		}

		heroSkinID := uint64(data.DeckClassHero(deckClass))

		deckEquipment.HeroSkin = &heroSkinID
	}

	return deckEquipment, nil
}

type HeroSkinFinder interface {
	HasFromDeckString(context.Context, proto.AccountID, string) (bool, error)
}

type ContractUSDC interface {
	CallBalanceOf(ctx context.Context, owner proto.Hash) (*big.Int, error)
}
