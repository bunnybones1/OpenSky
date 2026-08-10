package data

import (
	"encoding/json"
	"fmt"
	"math/big"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	itemTypeMask = uint64(0xFF0000)
	itemIDMask   = uint64(0x00FFFF)

	StickerPointsItemID  = uint64(1)
	XPItemID             = uint64(1)
	ConquestTicketItemID = uint64(2)
)

var (
	StickerPointsTokenID  = ItemTypeAndID2SWTokenID(proto.ItemType_SW_STICKER_POINTS, StickerPointsItemID)
	XPTokenID             = ItemTypeAndID2SWTokenID(proto.ItemType_SW_XP, XPItemID)
	ConquestTicketTokenID = ItemTypeAndID2SWTokenID(proto.ItemType_SW_CONQUEST_TICKET, ConquestTicketItemID)

	ErrInsufficientBalance = fmt.Errorf("insufficient balance")
)

type Item struct {
	*proto.Item
}

func SWTokenID2TypeAndItemID(tokenID uint64) (proto.ItemType, uint64, error) {
	itemID := tokenID & itemIDMask
	itemType := (tokenID & itemTypeMask) >> 16

	switch itemType {
	case 0:
		return proto.ItemType_SW_BASE_CARDS, itemID, nil

	case 1:
		return proto.ItemType_SW_SILVER_CARDS, itemID, nil

	case 2:
		return proto.ItemType_SW_GOLD_CARDS, itemID, nil

	case 3:
		return proto.ItemType_SW_HERO_SKINS, itemID, nil

	case 4:
		return proto.ItemType_SW_CRYSTALS, itemID, nil

	case 5:
		return proto.ItemType_SW_STICKERS, itemID, nil

	case 6:
		return proto.ItemType_SW_CARD_BACKS, itemID, nil

	case 7:
		return proto.ItemType_SW_SKYPASS, itemID, nil

	case 8:
		return proto.ItemType_SW_TITLES, itemID, nil

	case 9:
		return proto.ItemType_SW_STICKER_POINTS, itemID, nil

	case 10:
		return proto.ItemType_SW_XP, itemID, nil

	case 254:
		return proto.ItemType_SW_CONQUEST_TICKET, itemID, nil

	default:
		return proto.ItemType_UNKNOWN, itemID, fmt.Errorf("invalid item type %d for token %d", itemType, tokenID)
	}
}

func ItemTypeAndID2SWTokenID(itemType proto.ItemType, itemID uint64) uint64 {
	switch itemType {
	case proto.ItemType_SW_SILVER_CARDS:
		return (1 << 16) + itemID

	case proto.ItemType_SW_GOLD_CARDS:
		return (2 << 16) + itemID

	case proto.ItemType_SW_HERO_SKINS:
		return (3 << 16) + itemID

	case proto.ItemType_SW_CRYSTALS:
		return (4 << 16) + itemID

	case proto.ItemType_SW_STICKERS:
		return (5 << 16) + itemID

	case proto.ItemType_SW_CARD_BACKS:
		return (6 << 16) + itemID

	case proto.ItemType_SW_SKYPASS:
		return (7 << 16) + itemID

	case proto.ItemType_SW_TITLES:
		return (8 << 16) + itemID

	case proto.ItemType_SW_STICKER_POINTS:
		return (9 << 16) + itemID

	case proto.ItemType_SW_XP:
		return (10 << 16) + itemID

	case proto.ItemType_SW_CONQUEST_TICKET:
		return (254 << 16) + itemID

	default:
		return itemID
	}
}

func SkypassTokenID(season uint16) uint64 {
	return ItemTypeAndID2SWTokenID(proto.ItemType_SW_SKYPASS, uint64(season))
}

func NewItem(item *proto.Item) *Item {
	return &Item{
		Item: item,
	}
}

func (i *Item) Store(sess db.Session) db.Store {
	return DB.Items(sess)
}

func (i *Item) Validate() error {
	if i.ItemType == 0 {
		return errors.Errorf("itemType cannot be 0")
	}
	return nil
}

func (i *Item) BeforeCreate(sess db.Session) error {
	i.CreatedAt = TimeNowUTCPtr()
	i.UpdatedAt = TimeNowUTCPtr()
	i.IsNew = SetBoolPointer(true)

	return nil
}

func (i *Item) BeforeUpdate(sess db.Session) error {
	i.UpdatedAt = TimeNowUTCPtr()
	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
		db.BeforeCreateHook
		db.BeforeUpdateHook
	} = &Item{}
)

type ItemStore struct {
	db.Collection
}

func (s *ItemStore) FindOne(conds ...interface{}) (*Item, error) {
	var item *Item

	err := s.Find(conds...).Limit(1).One(&item)
	if err != nil {
		return nil, err
	}

	return item, nil
}

// FindAccountItem queries for a specific item by type
func (s *ItemStore) FindAccountItem(accountID proto.AccountID, itemType proto.ItemType, tokenID uint64) (*Item, error) {
	return s.FindOne(db.Cond{
		"account_id": accountID,
		"item_type":  itemType,
		"token_id":   tokenID,
	})
}

// TODO: pagination or something..?
func (s *ItemStore) FindAccountItems(accountID proto.AccountID, itemTypes ...proto.ItemType) ([]*Item, error) {
	var items []*Item

	// TODO: pagination...

	if len(itemTypes) == 0 {
		err := s.Find(db.Cond{
			"account_id": accountID,
		}).All(&items)
		if err != nil {
			return nil, err
		}
		return items, nil
	}

	err := s.Find(db.And(
		db.Cond{
			"account_id": accountID,
			"item_type":  db.AnyOf(itemTypes),
		},
	)).All(&items)
	if err != nil {
		return nil, err
	}

	return items, nil
}

func (s *ItemStore) GainToken(accountID proto.AccountID, tokenID uint64, amount *big.Int, transactionType proto.TransactionType, externalID string) error {
	if amount == nil {
		return fmt.Errorf("no amount")
	}

	if amount.Sign() == 0 {
		return fmt.Errorf("amount is zero")
	}

	if amount.Sign() == -1 {
		return fmt.Errorf("amount is negative")
	}

	if transactionType == proto.TransactionType_UNKNOWN {
		return fmt.Errorf("transaction type is unknown")
	}

	itemType, itemID, err := SWTokenID2TypeAndItemID(tokenID)
	if err != nil {
		return fmt.Errorf("convert token ID: %w", err)
	}

	if externalID == "" {
		externalID = uuid.NewString()
	}

	result, err := s.Session().SQL().Exec(`
UPDATE items
SET balance = balance + ?
WHERE item_type = ?
  AND token_id = ?
  AND account_id = ?`,
		amount.Uint64(), itemType, itemID, accountID)
	if err != nil {
		return fmt.Errorf("update balance: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}

	if rowsAffected > 1 {
		return fmt.Errorf("multiple items updated")
	}

	// no token in db create new one
	if rowsAffected == 0 {
		item := &Item{
			Item: &proto.Item{
				AccountID: accountID,
				ItemType:  itemType,
				TokenID:   itemID,
				Balance:   prototyp.ToBigInt(amount),
			},
		}

		if err := s.Session().Save(item); err != nil {
			return fmt.Errorf("save new item: %w", err)
		}
	}

	transaction := &Transaction{
		Transaction: &proto.Transaction{
			TransactionType: transactionType,
			AccountID:       accountID,
			TokenID:         tokenID,
			Amount:          prototyp.ToBigInt(amount),
			ExternalTxnID:   externalID,
		},
	}

	if err := s.Session().Save(transaction); err != nil {
		return fmt.Errorf("save transaction: %w", err)
	}

	return nil
}

func (s *ItemStore) SpendToken(accountID proto.AccountID, tokenID uint64, amount *big.Int, transactionType proto.TransactionType, externalID string) error {
	if amount == nil {
		return fmt.Errorf("no amount")
	}

	if amount.Sign() == 0 {
		return fmt.Errorf("amount is zero")
	}

	if amount.Sign() == -1 {
		return fmt.Errorf("amount is negative")
	}

	if transactionType == proto.TransactionType_UNKNOWN {
		return fmt.Errorf("transaction type is unknown")
	}

	itemType, itemID, err := SWTokenID2TypeAndItemID(tokenID)
	if err != nil {
		return fmt.Errorf("convert token ID: %w", err)
	}

	if externalID == "" {
		externalID = uuid.NewString()
	}

	result, err := s.Session().SQL().Exec(`
UPDATE items
SET balance = balance - ?
WHERE item_type = ?
  AND token_id = ?
  AND account_id = ?
  AND balance >= ?`,
		amount.Uint64(), itemType, itemID, accountID, amount.Uint64())
	if err != nil {
		return fmt.Errorf("update balance: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}

	if rowsAffected > 1 {
		return fmt.Errorf("multiple items updated")
	}

	if rowsAffected == 0 {
		return ErrInsufficientBalance
	}

	transaction := &Transaction{
		Transaction: &proto.Transaction{
			TransactionType: transactionType,
			AccountID:       accountID,
			TokenID:         tokenID,
			Amount:          prototyp.ToBigInt(amount.Neg(amount)),
			ExternalTxnID:   externalID,
		},
	}

	if err := s.Session().Save(transaction); err != nil {
		return fmt.Errorf("save transaction: %w", err)
	}

	return nil
}

func (s *ItemStore) GainStickerPoints(accountID proto.AccountID, amount *big.Int, transactionType proto.TransactionType, externalID string) error {
	return s.GainToken(accountID, StickerPointsTokenID, amount, transactionType, externalID)
}

func (s *ItemStore) GetStickerPoints(accountID proto.AccountID) (uint64, error) {
	item, err := s.FindAccountItem(accountID, proto.ItemType_SW_STICKER_POINTS, StickerPointsItemID)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return 0, fmt.Errorf("find account item: %w", err)
	}

	if item == nil || errors.Is(err, db.ErrNoMoreRows) {
		return 0, nil
	}

	return item.Balance.Uint64(), nil
}

func (s *ItemStore) SpendStickerPoints(accountID proto.AccountID, amount *big.Int, transactionType proto.TransactionType, externalID string) error {
	return s.SpendToken(accountID, StickerPointsTokenID, amount, transactionType, externalID)
}

func (s *ItemStore) GainXP(accountID proto.AccountID, amount *big.Int, transactionType proto.TransactionType, externalID string) error {
	return s.GainToken(accountID, XPTokenID, amount, transactionType, externalID)
}

func (s *ItemStore) GetXP(accountID proto.AccountID) (uint64, error) {
	item, err := s.FindAccountItem(accountID, proto.ItemType_SW_XP, XPItemID)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return 0, fmt.Errorf("find account item: %w", err)
	}

	// Migration from the account experience record to items.
	if item == nil || errors.Is(err, db.ErrNoMoreRows) {
		_, err = s.Session().SQL().Exec(`
			INSERT INTO items (account_id, item_type, token_id, balance)
		  		VALUES(?, ?, ?, (SELECT experience FROM accounts WHERE id = ?) )
			ON CONFLICT (account_id, item_type, token_id) WHERE (contract_address IS NULL)
				DO NOTHING 
			`, accountID, proto.ItemType_SW_XP, XPItemID, accountID)
		if err != nil {
			return 0, fmt.Errorf("migrate xp: %w", err)
		}

		_, err = s.Session().SQL().Exec("UPDATE accounts SET experience = 0 WHERE id = ?", accountID)
		if err != nil {
			return 0, fmt.Errorf("reset account experience: %w", err)
		}

		item, err = s.FindAccountItem(accountID, proto.ItemType_SW_XP, XPItemID)
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			return 0, fmt.Errorf("find account item: %w", err)
		}
	}

	return item.Balance.Uint64(), nil
}

func (s *ItemStore) SpendXP(accountID proto.AccountID, amount *big.Int, transactionType proto.TransactionType, externalID string) error {
	return s.SpendToken(accountID, XPTokenID, amount, transactionType, externalID)
}

func (s *ItemStore) GainConquestTickets(accountID proto.AccountID, amount *big.Int, transactionType proto.TransactionType, externalID string) error {
	return s.GainToken(accountID, ConquestTicketTokenID, amount, transactionType, externalID)
}

func (s *ItemStore) GetConquestTickets(accountID proto.AccountID) (uint64, error) {
	item, err := s.FindAccountItem(accountID, proto.ItemType_SW_CONQUEST_TICKET, ConquestTicketItemID)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return 0, fmt.Errorf("find account item: %w", err)
	}

	if item == nil || errors.Is(err, db.ErrNoMoreRows) {
		return 0, nil
	}

	return item.Balance.Uint64(), nil
}

func (s *ItemStore) SpendConquestTicket(accountID proto.AccountID, transactionType proto.TransactionType, externalID string) error {
	return s.SpendToken(accountID, ConquestTicketTokenID, big.NewInt(1), transactionType, externalID)
}

func (s *ItemStore) BulkBalanceUpdate(balanceUpdates []ItemBalanceUpdate) error {
	if len(balanceUpdates) > 0 {
		payload, err := json.Marshal(balanceUpdates)
		if err != nil {
			return fmt.Errorf("json encode balance updates: %w", err)
		}

		_, err = s.Session().SQL().Exec("SELECT bulk_balance_update(?)", payload)
		if err != nil {
			return fmt.Errorf("execute bulk_balance_update: %w", err)
		}
	}

	return nil
}

func (s *ItemStore) AssignItemsToAccount(address proto.Hash, accountID proto.AccountID) error {
	if !address.IsValidAddress() {
		return fmt.Errorf("invalid account address %s", address)
	}

	if !accountID.IsValid() {
		return fmt.Errorf("invalid account ID %d", accountID)
	}

	_, err := s.Session().SQL().Exec(`
		UPDATE items
		SET account_id = ?
		WHERE account_address = ?
			AND account_id = 0
`, accountID, address)
	if err != nil {
		return fmt.Errorf("update items: %w", err)
	}

	return nil
}

func (s *ItemStore) MarkNotNew(accountID proto.AccountID, itemType proto.ItemType, tokenIDs ...uint64) error {
	updateCond := db.Cond{
		"is_new": false,
	}

	err := s.Find(db.Cond{
		"account_id": accountID,
		"item_type":  itemType,
		"token_id":   db.AnyOf(tokenIDs),
	}).Update(updateCond)
	if err != nil {
		return fmt.Errorf("update isNew: %w", err)
	}

	return nil
}

type ItemBalanceUpdate struct {
	AccountAddress  proto.Hash      `json:"account_address"`
	ContractAddress proto.Hash      `json:"contract_address"`
	ItemType        uint            `json:"item_type"`
	TokenID         uint64          `json:"token_id"`
	Balance         prototyp.BigInt `json:"balance"`
}
