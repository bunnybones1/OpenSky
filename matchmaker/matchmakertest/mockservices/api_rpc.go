package mockservices

import (
	"context"
	"crypto/sha1"
	"math/rand"
	"time"

	"github.com/0xsequence/go-sequence/lib/prototyp"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
)

type openskyAPIServer struct {
}

func (s *openskyAPIServer) GetAuthToken(ctx context.Context, ethAuthProofString string) (bool, string, string, *proto.Account, error) {
	return false, "", "", nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetSession(ctx context.Context) (string, *proto.Account, error) {
	return "", nil, ErrNotImplemented
}

func (s *openskyAPIServer) MigrateAccount(ctx context.Context, req *proto.MigrateAccountRequest) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) RegisterAccount(ctx context.Context, account *proto.AccountRegistration, captcha string) (bool, *proto.Account, error) {
	return false, nil, ErrNotImplemented
}

func (s *openskyAPIServer) InternalListUnlockedDeckStrings(ctx context.Context, req *proto.InternalListUnlockedDeckStringsRequest) ([]string, error) {
	return []string{
		"SWxSTR0224gSjisS9WiYTUwzdwyc7xYgw9eR2us1aSrgBNHNAnSpFH8P7Sb4RdUXCD8c7FjHgbLwCJXttb1C7upZe7",
		"SWxAGY024CAxrwfsrA9eYhhNyQi9pLjFcmGceZxi9zK3oQUVNZFNg42TuUXzo6irh9u49sBQP844boVSuuixb8WA6f",
	}, nil
}

func (s *openskyAPIServer) InternalGetBotAccounts(ctx context.Context, req *proto.InternalGetBotAccountsRequest) ([]*proto.Account, error) {
	now := time.Now()

	accounts := []*proto.Account{
		{
			Address:   matchmakertest.BotA.Address(),
			Name:      "bot-account-a",
			Locale:    "en",
			CreatedAt: &now,
			UpdatedAt: &now,
		},
		{
			Address:   matchmakertest.BotB.Address(),
			Name:      "bot-account-b",
			Locale:    "en",
			CreatedAt: &now,
			UpdatedAt: &now,
		},
	}

	return accounts, nil
}

func (s *openskyAPIServer) InternalGetAccount(ctx context.Context, address string) (*proto.Account, error) {
	scorePtr := func(n int32) *int32 {
		return &n
	}

	stats := map[string]*proto.AccountStats{
		matchmakertest.PlayerA.Address().String(): {
			RankedConstructed: &proto.AccountStat{
				PlayerRank: proto.PlayerRank_MASTER,
				Score:      scorePtr(100),
			},
			RankedDiscovery: &proto.AccountStat{
				PlayerRank: proto.PlayerRank_UNRANKED,
				Score:      scorePtr(200),
			},
		},
		matchmakertest.PlayerB.Address().String(): {
			RankedConstructed: &proto.AccountStat{
				PlayerRank: proto.PlayerRank_MASTER,
				Score:      scorePtr(180),
			},
			RankedDiscovery: &proto.AccountStat{
				PlayerRank: proto.PlayerRank_WANDERER,
				Score:      scorePtr(300),
			},
		},
		matchmakertest.PlayerAppTest1.Address().String(): {
			RankedConstructed: &proto.AccountStat{
				PlayerRank: proto.PlayerRank_APPRENTICE,
				Score:      scorePtr(100),
			},
			RankedDiscovery: &proto.AccountStat{
				PlayerRank: proto.PlayerRank_APPRENTICE,
				Score:      scorePtr(200),
			},
		},
		matchmakertest.PlayerAppTest2.Address().String(): {
			RankedConstructed: &proto.AccountStat{
				PlayerRank: proto.PlayerRank_APPRENTICE,
				Score:      scorePtr(100),
			},
			RankedDiscovery: &proto.AccountStat{
				PlayerRank: proto.PlayerRank_APPRENTICE,
				Score:      scorePtr(200),
			},
		},
	}

	now := time.Now()

	account := &proto.Account{
		Address:   proto.Hash(address),
		Name:      "auto-account-" + address,
		Locale:    "en",
		CreatedAt: &now,
		UpdatedAt: &now,
		WarmUps:   3,
	}

	if s, ok := stats[address]; ok {
		account.Stats = s
	}

	return account, nil
}

func (s *openskyAPIServer) GetAccount(ctx context.Context, address string) (*proto.Account, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetAccountByUsername(ctx context.Context, username string) (*proto.Account, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetAccountStats(ctx context.Context, address string, seasons []uint16) ([]*proto.AccountStat, []*proto.AccountStat, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) InternalGetAccountStats(ctx context.Context, address string, seasons []uint16) ([]*proto.AccountStat, []*proto.AccountStat, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) AccountExists(ctx context.Context, address string) (bool, bool, error) {
	return false, false, ErrNotImplemented
}

func (s *openskyAPIServer) AccountExistsByName(ctx context.Context, name string) (bool, bool, error) {
	return false, false, ErrNotImplemented
}

func (s *openskyAPIServer) UpdateAccount(ctx context.Context, account *proto.Account) (*proto.Account, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) RequestMoreInvites(ctx context.Context) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) UserStorageFetch(ctx context.Context, key string) (interface{}, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) UserStorageSave(ctx context.Context, key string, object interface{}) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) UserStorageDelete(ctx context.Context, key string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) UserStorageFetchAll(ctx context.Context, keys []string) (map[string]interface{}, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetFeed(ctx context.Context, page *proto.Page, req *proto.GetFeedRequest) (*proto.Page, []*proto.FeedEvent, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetItemSummary(ctx context.Context, accountAddress string, contractQuery *bool) (map[string]*proto.ItemSummary, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetItemSupply(ctx context.Context, tokenID uint64) (map[string]*proto.Item, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetBatchItemSupply(ctx context.Context, tokenIDs []uint64) (map[uint64]map[string]*proto.Item, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) MarkItemsNotNew(ctx context.Context, tokenIDs []uint64, immediately *bool) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) EquipItem(ctx context.Context, itemType *proto.ItemType, tokenID uint64) (*proto.Item, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) UnequipItem(ctx context.Context, itemType *proto.ItemType, tokenID uint64) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) ListEquippedItems(ctx context.Context, itemType *proto.ItemType) ([]*proto.Item, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetDeckEquipmentByDeckString(ctx context.Context, accountAddress *string, deckString string) (*proto.DeckEquipment, error) {
	return nil, nil
}

func (s *openskyAPIServer) GetItemSuppliesByType(ctx context.Context, itemTypes []*proto.ItemType) (map[uint][]*proto.ItemSupply, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetCardLibrary(ctx context.Context, page *proto.Page) ([]*proto.Card, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetCardsByID(ctx context.Context, cardIDs []uint64) ([]*proto.Card, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetCardsByDeckString(ctx context.Context, deckString string) ([]*proto.Card, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) SearchCards(ctx context.Context, page *proto.Page, req *proto.SearchCardsRequest) (*proto.Page, []*proto.CardWithBalance, error) {
	cards := make([]*proto.CardWithBalance, 0, 15)
	added := map[uint64]bool{}

	for i := 0; i < 15; i++ {
		card := matchmakertest.Cards[rand.Intn(len(matchmakertest.Cards))]

		if added[card.ID] {
			continue
		}
		added[card.ID] = true

		now := time.Now()
		cards = append(cards, &proto.CardWithBalance{
			Card: &card,
			BalanceByType: map[string]*proto.BalanceTuple{
				"SW_BASE_CARDS": &proto.BalanceTuple{
					Balance: prototyp.NewBigInt(int64(rand.Intn(5))),
				},
				"SW_GOLD_CARDS": &proto.BalanceTuple{
					Balance: prototyp.NewBigInt(int64(rand.Intn(3))),
				},
				"SW_SILVER_CARDS": &proto.BalanceTuple{
					Balance: prototyp.NewBigInt(int64(rand.Intn(2))),
				},
			},
			CreatedAt: &now,
		})
	}

	return &proto.Page{}, cards, nil
}

func (s *openskyAPIServer) GetCardOwnership(ctx context.Context, accountAddress *string, contractQuery *bool) (*proto.CardOwnershipResponse, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) ListDecks(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.Deck, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) SearchDecks(ctx context.Context, page *proto.Page, req *proto.SearchDecksRequest) (*proto.Page, []*proto.Deck, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) CreateDeck(ctx context.Context, req *proto.CreateDeckRequest) (*proto.Deck, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) UpdateDeck(ctx context.Context, req *proto.UpdateDeckRequest) (*proto.Deck, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) FavoriteDeck(ctx context.Context, uuid string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) UnfavoriteDeck(ctx context.Context, uuid string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) ToggleDeckFavorite(ctx context.Context, uuid string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GetDeck(ctx context.Context, req *proto.DeckRequest) (*proto.Deck, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) CheckDeck(ctx context.Context, req *proto.CheckDeckRequest) (*proto.CheckDeckResponse, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) DeleteDeck(ctx context.Context, req *proto.DeckRequest) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) SearchDeckRanks(ctx context.Context, page *proto.Page, req *proto.SearchDeckRanksRequest) (*proto.Page, []*proto.DeckRank, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) ListDeckRanks(ctx context.Context, page *proto.Page, req *proto.ListDeckRanksRequest) (*proto.Page, []*proto.DeckRankAccount, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) ListLeaderboard(ctx context.Context, page *proto.Page, req *proto.ListLeaderboardRequest) (*proto.Page, []*proto.LeaderboardEntry, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) ListMatches(ctx context.Context, page *proto.Page, req *proto.ListMatchesRequest) (*proto.Page, []*proto.Match, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetMatch(ctx context.Context, matchID uint64) (*proto.Match, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetCurrentSeason(ctx context.Context) (uint16, error) {
	return 1000, nil
}

func (s *openskyAPIServer) GetNextRewardsTime(ctx context.Context) (string, error) {
	return "", ErrNotImplemented
}

func (s *openskyAPIServer) GetNextSeasonTime(ctx context.Context) (string, error) {
	return "", ErrNotImplemented
}

func (s *openskyAPIServer) GetCurrentSeasonStartTime(ctx context.Context) (string, error) {
	return "", ErrNotImplemented
}

func (s *openskyAPIServer) AccountLeaderboard(ctx context.Context, page *proto.Page, req *proto.AccountLeaderboardRequest) (*proto.Page, []*proto.LeaderboardEntry, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetMatchArchiveRecordsURI(ctx context.Context, matchID uint64, replayID string) (bool, *proto.Match, string, []string, error) {
	return false, nil, "", nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetMatchLiveRecordsURI(ctx context.Context, matchID uint64) (bool, *proto.Match, string, error) {
	return false, nil, "", ErrNotImplemented
}

func (s *openskyAPIServer) BotMatchEnd(ctx context.Context, req *proto.BotMatchEndRequest) ([]*proto.Reward, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) InternalMatchStart(ctx context.Context, req *proto.MatchStartRequest) (uint64, string, error) {
	matchID := rand.Uint64()
	replayID := string(sha1.New().Sum(nil))
	return matchID, replayID, nil
}

func (s *openskyAPIServer) InternalMatchEnd(ctx context.Context, req *proto.MatchEndRequest) ([]*proto.Reward, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) InternalAppendMatchArchiveRecords(ctx context.Context, matchID uint64, index int64, jsonStringData string) (bool, string, error) {
	return false, "", ErrNotImplemented
}

func (s *openskyAPIServer) InternalAppendMatchLiveRecords(ctx context.Context, matchID uint64, index int64, jsonStringData string) (bool, string, error) {
	return false, "", ErrNotImplemented
}

func (s *openskyAPIServer) InternalConquestStatus(ctx context.Context, address string) (*proto.Conquest, error) {
	deckClass := proto.DeckClass_STR
	conquest := &proto.Conquest{
		ID:        1,
		Status:    proto.ConquestStatus_IN_PROGRESS,
		DeckClass: &deckClass,
	}
	return conquest, nil
}

func (s *openskyAPIServer) EnterConquest(ctx context.Context, hero *proto.Hero) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) ConquestStatus(ctx context.Context) (*proto.Conquest, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) ConquestStats(ctx context.Context) (*proto.ConquestStats, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) ConquestRewards(ctx context.Context) ([]*proto.WeeklyGolds, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) ConquestPoints(ctx context.Context) (uint64, uint64, error) {
	return 0, 0, nil
}

func (s *openskyAPIServer) ConquestV2Pool(ctx context.Context) (*proto.ConquestV2Pool, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) ConquestV2Progress(ctx context.Context) (*proto.ConquestV2TreasureProgress, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) ListSkypassRewards(ctx context.Context, season *uint16, accountAddress *string) (*proto.ListSkypassRewardsResponse, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) ClaimSkypassRewards(ctx context.Context, ids []uint64, accountAddress *string) ([]*proto.Reward, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMListSkypassRewards(ctx context.Context, season *uint16) ([]*proto.SkypassReward, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMUpdateSkypassRewards(ctx context.Context, season uint16, url string) ([]*proto.SkypassReward, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMHasSkypassPremium(ctx context.Context, address string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMToggleSkypassPremium(ctx context.Context, address string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) IAPVerifyGoogleProducts2(ctx context.Context, req *proto.IAPPurchaseRequest) (*proto.GoogleProductPurchase, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) IAPVerifyAppleProducts2(ctx context.Context, req *proto.IAPPurchaseRequest) (*proto.AppleIAPResponse, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) ListPaymentProviderProducts(ctx context.Context, provider *proto.PaymentProvider, itemType *proto.ItemType) ([]*proto.PaymentProviderProduct, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) VerifyGooglePlayPayment(ctx context.Context, providerResponse *proto.GooglePlayPaymentResponse) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) VerifyAppleAppStorePayment(ctx context.Context, providerResponse *proto.AppleAppStorePaymentResponse) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) VerifySamsungGalaxyStorePayment(ctx context.Context, providerResponse *proto.SamsungGalaxyStorePaymentResponse) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) CreateStripePaymentIntent(ctx context.Context, productID string) (*proto.StripeCheckout, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) StripeEventWebhook(ctx context.Context, id string, object string, data *proto.StripeEventData) error {
	return ErrNotImplemented
}

func (s *openskyAPIServer) PrepareOnChainTransaction(ctx context.Context, productID string) ([]*proto.OnChainTransaction, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) PrepareOnChainInCurrencyTransaction(ctx context.Context, productID string, quantity uint64) ([]*proto.OnChainTransaction, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) PrepareOnChainInItemsTransaction(ctx context.Context, productID string, quantity uint64, tokenIDsToBurn []uint64) ([]*proto.OnChainTransaction, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMListPayments(ctx context.Context, page *proto.Page, status *proto.PaymentStatus, provider *proto.PaymentProvider, address *string) (*proto.Page, []*proto.Payment, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMListPaymentLogs(ctx context.Context, paymentID uint64) ([]*proto.PaymentLog, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) ListQuests(ctx context.Context, accountAddress *string) ([]*proto.Quest, []*proto.Reward, error) {
	return nil, nil, nil
}

func (s *openskyAPIServer) ClaimQuestRewards(ctx context.Context, ids []uint64, accountAddress *string) (*proto.Quest, []*proto.Reward, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) ReRollQuest(ctx context.Context, id uint64) (*proto.Quest, []*proto.Reward, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) SetQuestsAsSeen(ctx context.Context, ids []uint64) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GetQuestsAutoRerollTime(ctx context.Context) (*proto.QuestsAutoRerollTimeResponse, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetEpicQuestChain(ctx context.Context, epicType *proto.EpicType) ([]*proto.Quest, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMCompleteQuest(ctx context.Context, accountAddress *string, id uint64) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMDeleteQuest(ctx context.Context, accountAddress *string, id uint64) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMResetQuestReRolls(ctx context.Context, accountAddress *string, periodicity *proto.QuestPeriodicity) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) JoinEarlyAccessList(ctx context.Context, emailAddress string) (bool, string, error) {
	return false, "", ErrNotImplemented
}

func (s *openskyAPIServer) RecordGameClientFeedback(ctx context.Context, req *proto.GameClientFeedback) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) HeroUnlockLevels(ctx context.Context) (map[string]uint16, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) DeckClassUnlockLevels(ctx context.Context) (map[string]uint16, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) AvailableXPBonuses(ctx context.Context) (int, error) {
	return 0, ErrNotImplemented
}

func (s *openskyAPIServer) ReportAccount(ctx context.Context, report *proto.Report) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) SaveCookiePolicy(ctx context.Context, cookieOptions map[string]bool) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GetCookiePolicy(ctx context.Context) (map[string]bool, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) AdminListAccounts(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.Account, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) AdminSearchAccounts(ctx context.Context, page *proto.Page, filterName string, filterAvatar string) (*proto.Page, []*proto.Account, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMFindAccount(ctx context.Context, name *string, accountAddress *string) (*proto.Account, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMAddBanner(ctx context.Context, bannersRequest *proto.BannersRequest) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMListBanners(ctx context.Context) ([]*proto.Banner, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMModifyBanner(ctx context.Context, banner *proto.Banner) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMRemoveBanner(ctx context.Context, id int64) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GetGameModesStatus(ctx context.Context) (*proto.GameModesStatus, error) {
	return &proto.GameModesStatus{
		Tutorial:             true,
		PracticeBot:          true,
		PracticePVP:          true,
		WarmUp:               true,
		RankedConstructed:    true,
		RankedDiscovery:      true,
		ConquestConstructed:  true,
		ConquestDiscovery:    true,
		ChallengeConstructed: true,
		ChallengeDiscovery:   true,
	}, nil
}

func (s *openskyAPIServer) GMStats(ctx context.Context) (*proto.GMStatsResponse, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMGameModeSet(ctx context.Context, gameMode *proto.GameMode, enable bool) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMGameModeStatusHistory(ctx context.Context, page *proto.Page, gameModes []*proto.GameMode) (*proto.Page, []*proto.GameModeStatusHistory, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMSetConquestV2PoolConfig(ctx context.Context, poolCeiling *int32, poolFloor *int32, topWeightUnitPrice *float32, bottomWeightUnitPrice *float32, weightPerSilverCard *float32) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMGetConquestV2PoolConfig(ctx context.Context) (*proto.ConquestV2PoolConfig, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMGetConquestV2Summary(ctx context.Context) (*proto.ConquestV2Summary, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMListConquestV2AccountTreasureProgress(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.ConquestV2AccountTreasureProgress, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMCreateOneTimeNotification(ctx context.Context, notification *proto.NotificationOneTime) (*proto.NotificationOneTime, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMListOneTimeNotifications(ctx context.Context) ([]*proto.NotificationOneTime, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMUpdateOneTimeNotification(ctx context.Context, notification *proto.NotificationOneTime) (*proto.NotificationOneTime, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMDeleteOneTimeNotification(ctx context.Context, id uint64) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GetBanners(ctx context.Context) ([]*proto.Banner, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMRenameAccount(ctx context.Context, oldName *string, accountAddress *string, newName string, lockedUntil *time.Time) (*proto.Account, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMUnlockAllBaseCards(ctx context.Context, accountAddress *string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMSetRank(ctx context.Context, accountAddress *string, mode *proto.GameMode, rank *proto.PlayerRank, rankPoints float32) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMSetRP(ctx context.Context, accountAddress *string, mode *proto.GameMode, rankPoints *int32) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMListAccountActions(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.AccountAction, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMCreateAccountAction(ctx context.Context, action *proto.AccountAction) (*proto.AccountAction, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMDisableAccountAction(ctx context.Context, actionID uint64) (*proto.AccountAction, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMIsAccountBanned(ctx context.Context, account string) (bool, *proto.AccountStatus, []*proto.AccountAction, error) {
	return false, nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMListAccountSignals(ctx context.Context, account *string) ([]*proto.AccountSignal, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMAccountSignalSummaries(ctx context.Context, page *proto.Page, accountStatus []*proto.AccountStatus, createdBefore *time.Time, createdAfter *time.Time, accountAddress *string) (*proto.Page, []*proto.AccountSignalSummary, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMListAccounts(ctx context.Context, page *proto.Page, accountStatus []*proto.AccountStatus, accountActions []*proto.AccountStatus, createdBefore *time.Time, createdAfter *time.Time, conquestsUnlocked *bool) (*proto.Page, []*proto.GMAccount, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMListMatches(ctx context.Context, page *proto.Page, req *proto.GMListMatchesRequest) (*proto.Page, []*proto.GMMatch, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMSetReviewed(ctx context.Context, matchId uint64, reviewed bool) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) Ping(ctx context.Context) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) Version(ctx context.Context) (*proto.Version, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) Clock(ctx context.Context) (time.Time, error) {
	return time.Time{}, ErrNotImplemented
}

func (s *openskyAPIServer) GetTwitchInfo(ctx context.Context) (*proto.TwitchInfoResponse, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetFeaturedStreamers(ctx context.Context) ([]*proto.TwitchFeaturedStreamer, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMAddFeaturedStreamer(ctx context.Context, streamer *proto.TwitchFeaturedStreamer) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMRemoveFeaturedStreamer(ctx context.Context, streamer *proto.TwitchFeaturedStreamer) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMCreateAppDevKey(ctx context.Context, req *proto.CreateAppDevKeyRequest) (*proto.AppDevKey, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMListAppDevKeys(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.AppDevKey, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMDisableAppDevKey(ctx context.Context, appDevKeyId uint64) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMEnableAppDevKey(ctx context.Context, appDevKeyId uint64) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMGetAppDevKeyToken(ctx context.Context, appDevKeyId uint64) (*proto.AppDevKey, string, error) {
	return nil, "", ErrNotImplemented
}

func (s *openskyAPIServer) GMSetWarmupGamesCompleted(ctx context.Context, accountAddress *string, numGamesCompleted uint8) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMListPendingCards(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.GMPendingCardsReponse, error) {
	return nil, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetPendingCards(ctx context.Context) ([]*proto.PendingCardsResponse, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetDiscordInfo(ctx context.Context) (*proto.DiscordInfoResponse, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) MarkDeckNotNew(ctx context.Context, uuid string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) ListUnlockedDeckClasses(ctx context.Context) ([]*proto.DeckClass, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GMResetStarterDecks(ctx context.Context, address string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) RequestAccountDeletion(ctx context.Context, proof *proto.WalletProof) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GMGiveLevels(ctx context.Context, accountAddress *string, levels uint16) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) SetInvitedBy(ctx context.Context, req *proto.SetInvitedByRequest) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) GetPrivateSpectateCode(ctx context.Context, reset *bool) (string, error) {
	return "", ErrNotImplemented
}

func (s *openskyAPIServer) ListNotifications(ctx context.Context) ([]*proto.Notification, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) SetNotificationsAsSeen(ctx context.Context, notificationIDs []uint64) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) MigrateFromBurner(ctx context.Context, ethAuthProofString string) (bool, error) {
	return false, ErrNotImplemented
}

func (s *openskyAPIServer) PrepareTransferAssetsFromBurnerTransaction(ctx context.Context) ([]*proto.OnChainTransaction, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetFriendPoints(ctx context.Context, address string) (uint64, []*proto.FriendPoints, error) {
	return 0, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetPointsGifted(ctx context.Context, address string) (uint64, *proto.Account, error) {
	return 0, nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetStickers(ctx context.Context) ([]*proto.Sticker, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) GetStickersBySeason(ctx context.Context, season uint16) ([]*proto.Sticker, error) {
	return nil, ErrNotImplemented
}

func (s *openskyAPIServer) InternalGetPrivateSpectateCode(ctx context.Context, address string) (string, error) {
	return "", ErrNotImplemented
}

func (s *openskyAPIServer) GetStickerOwnership(ctx context.Context, accountAddress *string) (*proto.StickerOwnershipResponse, error) {
	return new(proto.StickerOwnershipResponse), nil
}

func (s *openskyAPIServer) GetItemOwnershipByType(ctx context.Context, accountAddress *string, itemType []*proto.ItemType) ([]*proto.Item, error) {
	return nil, nil
}

func (s *openskyAPIServer) ConquestTreasuresInfo(ctx context.Context) (map[uint16]*proto.ConquestTreasureInfo, error) {
	return nil, ErrNotImplemented
}
