package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/httplog"
)

// NOTE: if a method is note listed below, it will by default blocked completely.
// black-list by default makes for better security and forces us to maintain this list.

// accessMap for /webrpc/api.SkyWeaverAPI/_METHODS_
var accessMap = map[string][]SessionType{

	//
	// Auth
	//
	"SignIn":         {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"GetAuthToken":   {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"MigrateAccount": {SessionTypeWallet},
	"GetSession":     {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},

	//
	// Accounts / user methods
	//
	"RegisterAccount":                            {SessionTypeWallet, SessionTypeUser},
	"GetAccount":                                 {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetAccountByUsername":                       {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"InternalGetAccount":                         {SessionTypeService},
	"GetAccountStats":                            {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"AccountExists":                              {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"AccountExistsByName":                        {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService, SessionTypeWallet},
	"UpdateAccount":                              {SessionTypeUser, SessionTypeAdmin},
	"RequestAccountDeletion":                     {SessionTypeUser, SessionTypeAdmin},
	"RequestMoreInvites":                         {SessionTypeUser, SessionTypeAdmin},
	"SetInvitedBy":                               {SessionTypeUser, SessionTypeAdmin},
	"GetPrivateSpectateCode":                     {SessionTypeUser, SessionTypeAdmin},
	"InternalGetPrivateSpectateCode":             {SessionTypeService, SessionTypeAdmin},
	"ListNotifications":                          {SessionTypeUser, SessionTypeAdmin},
	"SetNotificationsAsSeen":                     {SessionTypeUser, SessionTypeAdmin},
	"MigrateFromBurner":                          {SessionTypeUser, SessionTypeAdmin},
	"PrepareTransferAssetsFromBurnerTransaction": {SessionTypeUser, SessionTypeAdmin},

	"UserStorageFetch":    {SessionTypeUser, SessionTypeAdmin},
	"UserStorageFetchAll": {SessionTypeUser, SessionTypeAdmin},
	"UserStorageSave":     {SessionTypeUser, SessionTypeAdmin},
	"UserStorageDelete":   {SessionTypeUser, SessionTypeAdmin},

	"GetFeed":             {SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"GetStickers":         {SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"GetStickersBySeason": {SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"GetStickerOwnership": {SessionTypeUser, SessionTypeAdmin, SessionTypeService},

	"GetFriendPoints": {SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"GetPointsGifted": {SessionTypeUser, SessionTypeAdmin, SessionTypeService},

	"InternalForceBalanceSync": {SessionTypeService},
	// "InternalDistributeRankedRewards":  {SessionTypeService},

	//
	// Items
	//
	"GetItemSummary":               {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetItemSupply":                {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetBatchItemSupply":           {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetItemSuppliesByType":        {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetItems":                     {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"SearchItems":                  {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetItemOwnershipByType":       {SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"MarkItemsNotNew":              {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"EquipItem":                    {SessionTypeUser, SessionTypeAdmin},
	"UnequipItem":                  {SessionTypeUser, SessionTypeAdmin},
	"ListEquippedItems":            {SessionTypeUser, SessionTypeAdmin},
	"GetDeckEquipmentByDeckString": {SessionTypeUser, SessionTypeAdmin, SessionTypeService},

	//
	// Cards
	//
	"GetCardLibrary":       {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetCardsByID":         {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetCardsByDeckString": {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetCards":             {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"SearchCards":          {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetCardOwnership":     {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetPendingCards":      {SessionTypeUser, SessionTypeAdmin},

	//
	// Decks
	//
	"ListDecks":               {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"SearchDecks":             {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"CreateDeck":              {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"UpdateDeck":              {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetDeck":                 {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"CheckDeck":               {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"DeleteDeck":              {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"FavoriteDeck":            {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"UnfavoriteDeck":          {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"MarkDeckNotNew":          {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"ToggleDeckFavorite":      {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"SearchDeckRanks":         {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"ListDeckRanks":           {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"ListUnlockedDeckClasses": {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GMResetStarterDecks":     {SessionTypeAdmin},

	//
	// Matches
	//
	"ListLeaderboard":                   {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"AccountLeaderboard":                {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"ListMatches":                       {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetMatch":                          {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetCurrentSeason":                  {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetNextRewardsTime":                {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetNextSeasonTime":                 {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetCurrentSeasonStartTime":         {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetMatchArchiveRecordsURI":         {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"GetMatchLiveRecordsURI":            {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"BotMatchEnd":                       {SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"InternalGetBotAccounts":            {SessionTypeService},
	"InternalListUnlockedDeckStrings":   {SessionTypeService},
	"InternalMatchStart":                {SessionTypeService},
	"InternalMatchEnd":                  {SessionTypeService},
	"InternalAppendMatchArchiveRecords": {SessionTypeService},
	"InternalAppendMatchLiveRecords":    {SessionTypeService},
	"InternalConquestStatus":            {SessionTypeService},

	//
	// Conquests
	//
	"EnterConquest":         {SessionTypeUser, SessionTypeAdmin},
	"ExitConquest":          {SessionTypeUser, SessionTypeAdmin},
	"ConquestStatus":        {SessionTypeUser, SessionTypeAdmin},
	"ConquestStats":         {SessionTypeUser, SessionTypeAdmin},
	"ConquestRewards":       {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"ConquestPoints":        {SessionTypeUser, SessionTypeAdmin},
	"ConquestTreasuresInfo": {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"ConquestV2Pool":        {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeAppDev, SessionTypeService},
	"ConquestV2Progress":    {SessionTypeUser, SessionTypeAdmin},

	//
	// Skypass
	//
	"ListSkypassRewards":  {SessionTypeUser, SessionTypeAdmin},
	"ClaimSkypassRewards": {SessionTypeUser, SessionTypeAdmin},

	"GMListSkypassRewards":   {SessionTypeAdmin},
	"GMUpdateSkypassRewards": {SessionTypeAdmin},
	"GMHasSkypassPremium":    {SessionTypeAdmin},
	"GMToggleSkypassPremium": {SessionTypeAdmin},

	//
	// Misc
	//
	"JoinEarlyAccessList":      {SessionTypePublic, SessionTypeWallet, SessionTypeUser},
	"RecordGameClientFeedback": {SessionTypeUser, SessionTypeAdmin},
	"HeroUnlockLevels":         {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"DeckClassUnlockLevels":    {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"AvailableXPBonuses":       {SessionTypeUser, SessionTypeAdmin},
	"ReportAccount":            {SessionTypeUser, SessionTypeAdmin},

	//
	// System
	//
	"Ping":    {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"Version": {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"Clock":   {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},

	//
	// Cookie policy
	//
	"SaveCookiePolicy": {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"GetCookiePolicy":  {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},

	//
	// Social Info
	//
	"GetDiscordInfo":           {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"GetTwitchInfo":            {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"GetFeaturedStreamers":     {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"GMAddFeaturedStreamer":    {SessionTypeAdmin},
	"GMRemoveFeaturedStreamer": {SessionTypeAdmin},

	//
	// Banners
	//
	"GetBanners":     {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"GMListBanners":  {SessionTypeAdmin},
	"GMAddBanner":    {SessionTypeAdmin},
	"GMModifyBanner": {SessionTypeAdmin},
	"GMRemoveBanner": {SessionTypeAdmin},

	//
	// Game modes
	//
	"GetGameModesStatus": {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},

	//
	// IAP
	//
	"IAPVerifyGoogleProducts": {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"IAPVerifyAppleProducts":  {SessionTypePublic, SessionTypeWallet, SessionTypeUser, SessionTypeAdmin, SessionTypeService},

	"IAPVerifyGoogleProducts2": {SessionTypePublic, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"IAPVerifyAppleProducts2":  {SessionTypePublic, SessionTypeUser, SessionTypeAdmin, SessionTypeService},

	//
	// Payments
	"ListPaymentProviderProducts":         {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"VerifyGooglePlayPayment":             {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"VerifyAppleAppStorePayment":          {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"VerifySamsungGalaxyStorePayment":     {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"CreateStripePaymentIntent":           {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"StripeEventWebhook":                  {SessionTypePublic},
	"PrepareOnChainTransaction":           {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"PrepareOnChainInCurrencyTransaction": {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"PrepareOnChainInItemsTransaction":    {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin},
	"GMListPayments":                      {SessionTypeAdmin},
	"GMListPaymentLogs":                   {SessionTypeAdmin},

	// Quests
	"ListQuests":              {SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"ClaimQuestRewards":       {SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"ReRollQuest":             {SessionTypeUser, SessionTypeAdmin},
	"SetQuestsAsSeen":         {SessionTypeUser, SessionTypeAdmin},
	"GetQuestsAutoRerollTime": {SessionTypePublic, SessionTypeUser, SessionTypeAdmin, SessionTypeService},
	"GetEpicQuestChain":       {SessionTypeUser, SessionTypeAdmin},
	"GMCompleteQuest":         {SessionTypeAdmin},
	"GMDeleteQuest":           {SessionTypeAdmin},
	"GMResetQuestReRolls":     {SessionTypeAdmin},

	//
	// Admin / Game Master endpoints
	//
	"AdminListAccounts":   {SessionTypeAdmin}, // TODO: is this in use? maybe rename?
	"AdminSearchAccounts": {SessionTypeAdmin}, // TODO: is this in use? maybe rename?

	"GMFindAccount":             {SessionTypeAdmin},
	"GMRenameAccount":           {SessionTypeAdmin},
	"GMUnlockAllBaseCards":      {SessionTypeAdmin},
	"GMGiveLevels":              {SessionTypeAdmin},
	"GMSetRP":                   {SessionTypeAdmin},
	"GMSetWarmupGamesCompleted": {SessionTypeAdmin},

	"GMListAccountActions":     {SessionTypeAdmin},
	"GMCreateAccountAction":    {SessionTypeAdmin},
	"GMDisableAccountAction":   {SessionTypeAdmin},
	"GMIsAccountBanned":        {SessionTypeAdmin},
	"GMAccountSignalSummaries": {SessionTypeAdmin},
	"GMListAccountSignals":     {SessionTypeAdmin},
	"GMListPendingCards":       {SessionTypeAdmin},
	"GMListAccounts":           {SessionTypeAdmin},
	"GMListMatches":            {SessionTypeAdmin},
	"GMSetReviewed":            {SessionTypeAdmin},

	"GMCreateAppDevKey":   {SessionTypeAdmin},
	"GMListAppDevKeys":    {SessionTypeAdmin},
	"GMDisableAppDevKey":  {SessionTypeAdmin},
	"GMEnableAppDevKey":   {SessionTypeAdmin},
	"GMGetAppDevKeyToken": {SessionTypeAdmin},

	"GMStats": {SessionTypeAdmin},

	"GMGameModeSet":           {SessionTypeAdmin},
	"GMGameModeStatusHistory": {SessionTypeAdmin},

	"GMSetConquestV2PoolConfig":               {SessionTypeAdmin},
	"GMGetConquestV2PoolConfig":               {SessionTypeAdmin},
	"GMGetConquestV2Summary":                  {SessionTypeAdmin},
	"GMListConquestV2AccountTreasureProgress": {SessionTypeAdmin},

	"GMCreateOneTimeNotification": {SessionTypeAdmin},
	"GMListOneTimeNotifications":  {SessionTypeAdmin},
	"GMUpdateOneTimeNotification": {SessionTypeAdmin},
	"GMDeleteOneTimeNotification": {SessionTypeAdmin},
}

type SessionType uint

// SECURITY NOTE: the order of this list is important, as there is a security
// hierarchy, greater number gets higher privilege
const (
	SessionTypeUnknown SessionType = iota // 0 - invalid
	SessionTypePublic                     // 1 - anonymous
	SessionTypeWallet                     // 2 - jwt from wallet proof
	SessionTypeUser                       // 3 - jwt of registered user
	SessionTypeAdmin                      // 4 - jwt of an admin user
	SessionTypeAppDev                     // 5 - jwt of an app developer / third-party partner
	SessionTypeService                    // 6 - jwt of a trusted Horizon service-level token
)

func AccessControl(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logEntry := httplog.LogEntry(r.Context())

		webrpcReq, err := newRequest(r.URL.Path)
		if err != nil {
			logEntry.Warn().Msg("invalid rpc method called")
			middlewareError(w, ErrUnauthorized)
			return
		}
		httplog.LogEntrySetField(r.Context(), "rpcService", webrpcReq.ServiceName)
		httplog.LogEntrySetField(r.Context(), "rpcMethod", webrpcReq.MethodName)

		err = webrpcReq.AuthorizeRequest(r)
		if err != nil {
			logEntry.Warn().Msg("unathorized request")
			middlewareError(w, ErrUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

type webrpcRequest struct {
	PackageName string
	ServiceName string
	MethodName  string
}

func newRequest(path string) (*webrpcRequest, error) {
	p1 := strings.Split(path, "/")
	if len(p1) != 4 {
		return nil, errors.New("access: unexpected method")
	}
	t := &webrpcRequest{
		PackageName: p1[1],
		ServiceName: p1[2],
		MethodName:  p1[3],
	}
	if t.PackageName == "" || t.ServiceName == "" || t.MethodName == "" {
		return nil, errors.New("access: unexpected method")
	}
	return t, nil
}

func (t *webrpcRequest) AuthorizeRequest(r *http.Request) error {
	if t.PackageName != "rpc" || t.ServiceName != "SkyWeaverAPI" {
		return ErrUnauthorized
	}

	perm, ok := accessMap[t.MethodName]
	if !ok {
		// unable to find method in rules list. deny.
		return ErrUnauthorized
	}

	ctx := r.Context()
	sessionType, ok := ctx.Value(SessionTypeCtxKey).(SessionType)
	if !ok {
		// should never happen as previous middleware will set it,
		// but lets be specific
		return ErrUnauthorized
	}

	accessDenied := true
	for _, v := range perm {
		if sessionType == v {
			accessDenied = false
			break
		}
	}

	if accessDenied {
		return ErrUnauthorized
	}

	return nil
}
