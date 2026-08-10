export declare const WebRPCVersion = "v1";
export declare const WebRPCSchemaVersion = "v0.3.0";
export declare const WebRPCSchemaHash = "34730d4723dccc67a76b11d856510e4517db63fd";
export declare enum AccountStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    BANNED = "BANNED",
    VIP = "VIP",
    FLAGGED = "FLAGGED",
    TO_DELETE = "TO_DELETE",
    DELETED = "DELETED"
}
export declare enum PlayerRank {
    UNKNOWN = "UNKNOWN",
    UNRANKED = "UNRANKED",
    WANDERER = "WANDERER",
    TRAINEE = "TRAINEE",
    APPRENTICE = "APPRENTICE",
    EXPERT = "EXPERT",
    MASTER = "MASTER",
    GRANDWEAVER = "GRANDWEAVER"
}
export declare enum PlayerRankStage {
    STAGE_NONE = "STAGE_NONE",
    STAGE_I = "STAGE_I",
    STAGE_II = "STAGE_II",
    STAGE_III = "STAGE_III"
}
export declare enum CookiePolicyOption {
    AUTHENTICATION = "AUTHENTICATION",
    MARKETPLACE = "MARKETPLACE",
    GEO_BLOCKING = "GEO_BLOCKING",
    PRODUCT_ANALYTICS = "PRODUCT_ANALYTICS"
}
export declare enum ContractType {
    UNKNOWN = "UNKNOWN",
    SKYWEAVER_ASSETS = "SKYWEAVER_ASSETS"
}
export declare enum ItemType {
    UNKNOWN = "UNKNOWN",
    USDC = "USDC",
    SW_BASE_CARDS = "SW_BASE_CARDS",
    SW_SILVER_DUST = "SW_SILVER_DUST",
    SW_SILVER_CARDS = "SW_SILVER_CARDS",
    SW_GOLD_CARDS = "SW_GOLD_CARDS",
    SW_CONQUEST_TICKET = "SW_CONQUEST_TICKET",
    SW_CRYSTALS = "SW_CRYSTALS",
    SW_STICKERS = "SW_STICKERS",
    SW_HERO_SKINS = "SW_HERO_SKINS",
    SW_CARD_BACKS = "SW_CARD_BACKS",
    SW_HERO = "SW_HERO"
}
export declare enum FeedEventType {
    LEVELUP = "LEVELUP",
    MATCH = "MATCH",
    REWARD = "REWARD",
    TRADE = "TRADE",
    RANKUP = "RANKUP",
    LEADERBOARD_REWARD = "LEADERBOARD_REWARD",
    HERO_UNLOCK = "HERO_UNLOCK",
    IAP_CONQUEST_MINTING = "IAP_CONQUEST_MINTING",
    DELAYED_REWARD = "DELAYED_REWARD",
    DELAYED_REWARD_MINTED = "DELAYED_REWARD_MINTED",
    STARTED_DECK_UNLOCK = "STARTED_DECK_UNLOCK",
    CONQUEST_V2_REWARD = "CONQUEST_V2_REWARD"
}
export declare enum Hero {
    UNKNOWN = "UNKNOWN",
    ADA = "ADA",
    SAMYA = "SAMYA",
    FOX = "FOX",
    LOTUS = "LOTUS",
    TITUS = "TITUS",
    IRIS = "IRIS",
    BOURAN = "BOURAN",
    HORIK = "HORIK",
    ZOEY = "ZOEY",
    AXEL = "AXEL",
    ARI = "ARI",
    MIRA = "MIRA",
    MAI = "MAI",
    BANJO = "BANJO",
    SITTI = "SITTI"
}
export declare enum DeckClass {
    UNKNOWN_CLASS = "UNKNOWN_CLASS",
    STR = "STR",
    HRT = "HRT",
    AGY = "AGY",
    INT = "INT",
    WIS = "WIS",
    STH = "STH",
    STA = "STA",
    STI = "STI",
    STW = "STW",
    HRA = "HRA",
    HRI = "HRI",
    HRW = "HRW",
    AGI = "AGI",
    AGW = "AGW",
    INW = "INW"
}
export declare enum CardType {
    UNIT = "UNIT",
    SPELL = "SPELL"
}
export declare enum CardKeyword {
    ARMOR = "ARMOR",
    STEALTH = "STEALTH",
    GUARD = "GUARD",
    BANNER = "BANNER",
    WITHER = "WITHER",
    DEATH = "DEATH"
}
export declare enum CardElement {
    WATER = "WATER",
    FIRE = "FIRE",
    EARTH = "EARTH",
    AIR = "AIR",
    MIND = "MIND",
    METAL = "METAL",
    LIGHT = "LIGHT",
    DARK = "DARK"
}
export declare enum CardStatus {
    PLAY = "PLAY",
    BLOCKED = "BLOCKED",
    CODE = "CODE"
}
export declare enum CardClass {
    STR = "STR",
    HRT = "HRT",
    AGY = "AGY",
    INT = "INT",
    WIS = "WIS",
    TOK = "TOK"
}
export declare enum CardSet {
    UNKNOWN = "UNKNOWN",
    CORE_SET = "CORE_SET",
    CORE_EXPANSION = "CORE_EXPANSION",
    CLASH_OF_INVENTORS = "CLASH_OF_INVENTORS",
    HEXBOUND_INVASION = "HEXBOUND_INVASION"
}
export declare enum GameMode {
    UNKNOWN = "UNKNOWN",
    RANKED_CONSTRUCTED = "RANKED_CONSTRUCTED",
    CHALLENGE_CONSTRUCTED = "CHALLENGE_CONSTRUCTED",
    TUTORIAL = "TUTORIAL",
    PRACTICE_BOT = "PRACTICE_BOT",
    RANKED_DISCOVERY = "RANKED_DISCOVERY",
    CONQUEST_CONSTRUCTED = "CONQUEST_CONSTRUCTED",
    CONQUEST_DISCOVERY = "CONQUEST_DISCOVERY",
    WARM_UP = "WARM_UP",
    CHALLENGE_DISCOVERY = "CHALLENGE_DISCOVERY",
    PRACTICE_PVP = "PRACTICE_PVP"
}
export declare enum MatchStatus {
    UNKNOWN = "UNKNOWN",
    COMPLETED = "COMPLETED",
    ABANDONED = "ABANDONED",
    FORFEITED = "FORFEITED",
    IN_PROGRESS = "IN_PROGRESS",
    CRASHED = "CRASHED"
}
export declare enum RewardType {
    EXP = "EXP",
    CARD = "CARD",
    RANK = "RANK",
    PRISM = "PRISM",
    HERO = "HERO",
    HERO_SKIN = "HERO_SKIN",
    DECK = "DECK",
    CONQUEST_POINTS = "CONQUEST_POINTS"
}
export declare enum DeckType {
    RANDOM = "RANDOM",
    CUSTOM = "CUSTOM",
    LOCKED_STARTER = "LOCKED_STARTER",
    UNLOCKED_STARTER = "UNLOCKED_STARTER"
}
export declare enum TaskStatus {
    PENDING = "PENDING",
    PAUSED = "PAUSED",
    FAILED = "FAILED",
    COMPLETED = "COMPLETED",
    DISABLED = "DISABLED"
}
export declare enum ConquestStatus {
    UNKNOWN = "UNKNOWN",
    IN_PROGRESS = "IN_PROGRESS",
    REWARDS_PENDING = "REWARDS_PENDING",
    COMPLETED = "COMPLETED"
}
export declare enum ConquestMatchResult {
    UNKNOWN = "UNKNOWN",
    WIN = "WIN",
    LOSS = "LOSS",
    DRAW = "DRAW"
}
export declare enum PurchaseStateAndroid {
    UNSPECIFIED_STATE = "UNSPECIFIED_STATE",
    PURCHASED = "PURCHASED",
    PENDING = "PENDING"
}
export declare enum IAPTransactionStatus {
    UNKNOWN = "UNKNOWN",
    MINTING_FAILED = "MINTING_FAILED",
    MINTING_PENDING = "MINTING_PENDING",
    MINTING_SUCCESS = "MINTING_SUCCESS",
    PAYMENT_FAILED = "PAYMENT_FAILED"
}
export declare enum ActionType {
    MOD_BAN = "MOD_BAN",
    MOD_SUSPENSION = "MOD_SUSPENSION",
    AUTO_BAN = "AUTO_BAN",
    AUTO_SUSPENSION = "AUTO_SUSPENSION",
    DELAYED_MOD_BAN = "DELAYED_MOD_BAN",
    DELAYED_MOD_SUSPENSION = "DELAYED_MOD_SUSPENSION",
    DELAYED_AUTO_BAN = "DELAYED_AUTO_BAN",
    DELAYED_AUTO_SUSPENSION = "DELAYED_AUTO_SUSPENSION",
    MOD_FLAG = "MOD_FLAG",
    AUTO_FLAG = "AUTO_FLAG",
    MOD_VET = "MOD_VET"
}
export declare enum SignalStatus {
    PENDING = "PENDING",
    ACTED_UPON = "ACTED_UPON",
    NOT_ACTIONABLE = "NOT_ACTIONABLE"
}
export declare enum SortOrder {
    DESC = "DESC",
    ASC = "ASC"
}
export declare enum BannerType {
    INFO = "INFO",
    WARNING = "WARNING",
    EMERGENCY = "EMERGENCY"
}
export declare enum NotificationType {
    LEADERBOARD_REWARD = "LEADERBOARD_REWARD",
    CONQUEST_V2_REWARD = "CONQUEST_V2_REWARD",
    SKYPASS_LEVEL_INTRODUCTION = "SKYPASS_LEVEL_INTRODUCTION",
    SEASON_START = "SEASON_START"
}
export declare enum SkypassTier {
    FREE = "FREE",
    PREMIUM = "PREMIUM"
}
export declare enum SkypassRewardType {
    XP_BOOST = "XP_BOOST",
    CONQUEST_TICKET = "CONQUEST_TICKET",
    STICKER_POINT = "STICKER_POINT",
    STICKER = "STICKER",
    HERO = "HERO",
    HERO_SKIN = "HERO_SKIN",
    BASE_CARD = "BASE_CARD",
    SILVER_CARD = "SILVER_CARD",
    CARD_BACK = "CARD_BACK"
}
export interface Version {
    webrpcVersion: string;
    schemaVersion: string;
    schemaHash: string;
    appVersion: string;
}
export interface Authorization {
    jwt: string;
}
export interface WalletProof {
    address: string;
    message: string;
    signature: string;
}
export interface SignInRequest {
    proof: WalletProof;
    account?: Account;
}
export interface SignInResponse {
    account: Account;
    authorization: Authorization;
}
export interface IPAddressHistory {
    id: number;
    accountAddress: string;
    ipAddress: string;
    createdAt: string;
}
export interface UserAgentHistory {
    id: number;
    accountAddress: string;
    userAgent: string;
    createdAt: string;
}
export interface Account {
    address: string;
    name: string;
    locale: string;
    createdAt: string;
    updatedAt: string;
    experience: number;
    warmUps: number;
    level: number;
    levelUpXP: number;
    stats?: AccountStats;
    region?: string;
    tagArtID?: string;
    crystalID?: number;
    settings?: AccountSettings;
    invitedBy?: string;
}
export interface AccountRegistration {
    account: Account;
    deviceProperties?: DeviceProperties;
}
export interface DeviceProperties {
    countryCode?: string;
    deviceID?: string;
    environmentDevice?: string;
    environmentOS?: string;
    environmentProduct?: string;
}
export interface AccountStats {
    rankedConstructed?: AccountStat;
    rankedDiscovery?: AccountStat;
    conquestConstructed?: AccountStat;
    conquestDiscovery?: AccountStat;
}
export interface AccountSettings {
    hidePlayerNames?: boolean;
    suspended?: boolean;
    requestMoreInvites?: boolean;
    renameLockedUntil?: string;
    starterDeckMigration?: boolean;
    spectateCode?: string;
    spectateCodeExpiresAt?: string;
    twitchProfile?: string;
}
export interface AccountStat {
    accountAddress: string;
    gameMode: GameMode;
    winCount: number;
    lossCount: number;
    tieCount: number;
    forfeitCount: number;
    abandonCount: number;
    winRatio: number;
    gamesPlayed: number;
    experience?: number;
    score?: number;
    createdAt: string;
    rank?: number;
    rankProgress?: number;
    playerRank: PlayerRank;
    playerRankStage: PlayerRankStage;
    winStreak: number;
    lossStreak: number;
    season?: number;
}
export interface SetInvitedByRequest {
    address: string;
    invitedBy: string;
}
export interface GMAccount {
    account: Account;
    conquestsUnlocked: boolean;
    accountActions: Array<AccountAction>;
    ipHistory: Array<IPAddressHistory>;
}
export interface Item {
    id: number;
    accountAddress: string;
    contractAddress?: string;
    itemType: ItemType;
    tokenID: number;
    balance: string;
    lastUpdateID: number;
    updatedAt?: string;
    createdAt?: string;
    isNew?: boolean;
}
export interface ItemSummary {
    id: number;
    accountAddress: string;
    itemType: ItemType;
    totalBalance: string;
    updatedAt?: string;
    createdAt?: string;
}
export interface ItemSupply {
    itemID: number;
    itemType: ItemType;
    totalBalance: string;
}
export interface GetFeedRequest {
    accountAddress: string;
    types?: Array<FeedEventType>;
}
export interface FeedEvent {
    id: number;
    accountAddress: string;
    type: FeedEventType;
    createdAt: string;
    match: Match;
    level?: number;
    playerRank?: PlayerRank;
    tokenIds?: Array<number>;
    cards: Array<Card>;
    heroes: Array<Hero>;
    gameMode?: GameMode;
    leaderboardRank?: number;
    conquestV2Reward?: number;
    conquestV2TreasureLevel?: number;
}
export interface CardImageURL {
    small: string;
    medium: string;
    large: string;
}
export interface Card {
    id: number;
    name: string;
    description: string;
    asset: string;
    class: CardClass;
    element: CardElement;
    type: CardType;
    manaCost: number;
    power: number;
    health: number;
    attachedSpellID?: number;
    keywords: Array<string>;
    status: CardStatus;
    set: CardSet;
    imageURL: CardImageURL;
    itemType: ItemType;
    isNew?: boolean;
    silverCardTokenId?: number;
    goldCardTokenId?: number;
}
export interface Sticker {
    id: number;
    name: string;
    requiredPoints: number;
    asset: string;
    tokenId: number;
    season: number;
}
export interface StickerOwnershipResponse {
    stickerBalances: {
        [key: number]: BalanceTuple;
    };
}
export interface LevelsPerSeason {
    address: string;
    inviter_address: string;
    season: number;
    levels: number;
    pointsCarried: number;
    pointsSpent: number;
}
export interface FriendPoints {
    account?: Account;
    season: number;
    levels: number;
    points: number;
    pointsSpent: number;
}
export interface CardSearchCriteria {
    ids?: Array<number>;
    cardClass?: Array<CardClass>;
    cardType?: CardType;
    cardElement?: Array<CardElement>;
    searchText?: string;
    cardManaCost?: Array<string>;
    itemType?: ItemType;
    ownedCards?: boolean;
    accountAddress?: string;
    includeTokens?: boolean;
}
export interface GetCardsRequest {
    ids: Array<number>;
    includeUserBalances: boolean;
    accountAddress?: string;
}
export interface SearchCardsRequest {
    criteria: CardSearchCriteria;
    includeUserBalances: boolean;
    contractQuery: boolean;
}
export interface CardWithBalance {
    card: Card;
    balance: string;
    balanceByType: {
        [key: string]: BalanceTuple;
    };
    createdAt: string;
}
export interface BalanceTuple {
    balance: string;
    isNew?: boolean;
}
export interface CardOwnershipResponse {
    cardBalances: {
        [key: number]: {
            [key: string]: BalanceTuple;
        };
    };
    lockedCards: number;
    lockedCardsByClass: {
        [key: string]: number;
    };
    lockedCardsByFrame: {
        [key: string]: number;
    };
    lockedCardsByClassAndFrame: {
        [key: string]: {
            [key: string]: number;
        };
    };
    unlockedCards: number;
    unlockedCardsByClass: {
        [key: string]: number;
    };
    unlockedCardsByFrame: {
        [key: string]: number;
    };
    unlockedCardsByClassAndFrame: {
        [key: string]: {
            [key: string]: number;
        };
    };
    pendingCards: number;
    pendingCardsByClass: {
        [key: string]: number;
    };
    pendingCardsByFrame: {
        [key: string]: number;
    };
    pendingCardsByClassAndFrame: {
        [key: string]: {
            [key: string]: number;
        };
    };
}
export interface PendingCardsResponse {
    cards: Array<Card>;
    tokenIDs: Array<number>;
    mintAt: string;
}
export interface GMPendingCardsReponse {
    account: Account;
    mintAt: string;
    cardsWonLastDay: number;
    cardsWonLastWeek: number;
}
export interface WeeklyGolds {
    startAt: string;
    endAt: string;
    tokenId: number;
    totalSupply: number;
}
export interface Deck {
    uuid: string;
    accountAddress: string;
    name: string;
    class: DeckClass;
    deckString: string;
    cardIds: Array<number>;
    art: string;
    createdAt: string;
    updatedAt: string;
    isFavorite: boolean;
    favoritedAt: string;
    deckType: DeckType;
    isNew: boolean;
    conquestV2Points: number;
}
export interface CheckDeckResponse {
    containsInvalid: boolean;
    accountOwnsAllCards: boolean;
    unlockedClass: boolean;
}
export interface CreateDeckRequest {
    name: string;
    class?: DeckClass;
    cardIds: Array<number>;
    art?: string;
}
export interface UpdateDeckRequestDeck {
    deckString: string;
    name: string;
    class: DeckClass;
    art?: string;
}
export interface UpdateDeckRequest {
    uuid?: string;
    deckString?: string;
    deck: UpdateDeckRequestDeck;
}
export interface DeckRequest {
    uuid?: string;
    deckString?: string;
}
export interface CheckDeckRequest {
    accountAddress?: string;
    uuid?: string;
    deckString?: string;
    contractQuery: boolean;
}
export interface SearchDecksRequest {
    deckString?: string;
    name?: string;
    class?: DeckClass;
}
export interface DeckRank {
    deckString: string;
    class: DeckClass;
    cardIds: Array<number>;
    winCount: number;
    lossCount: number;
    forfeitCount: number;
    abandonCount: number;
    tieCount: number;
    winRatio: number;
    gamesPlayed: number;
    score?: number;
    highestPlayerAddress: string;
}
export interface SearchDeckRanksRequest {
    deckString?: string;
    classes?: Array<DeckClass>;
    withCards?: Array<number>;
}
export interface ListDeckRanksRequest {
    class?: DeckClass;
}
export interface DeckRankAccount {
    deckRank: DeckRank;
    highestPlayer: Account;
}
export interface Match {
    id: number;
    status: MatchStatus;
    player1: MatchPlayer;
    player2: MatchPlayer;
    player1GameMode: GameMode;
    player2GameMode: GameMode;
    initPlayer1DeckNumCards: number;
    initPlayer2DeckNumCards: number;
    player1DeckClass?: DeckClass;
    player2DeckClass?: DeckClass;
    winningPlayer?: number;
    turnNonce: number;
    player1Moves: number;
    player2Moves: number;
    metrics: {
        [key: string]: any;
    };
    startedAt?: string;
    endedAt?: string;
    updatedAt?: string;
    createdAt?: string;
    replayID: string;
}
export interface GMMatch {
    match: Match;
    reviewed: boolean;
    duration?: number;
}
export interface MatchStartRequest {
    player1: MatchPlayer;
    player2: MatchPlayer;
    info?: MatchStartInfo;
}
export interface MatchStartInfo {
    player1GameMode: GameMode;
    player2GameMode: GameMode;
    player1RequestedAt: string;
    player2RequestedAt: string;
    matchedAt: string;
}
export interface MatchPlayer {
    address: string;
    name: string;
    region?: string;
    tagArtID?: string;
    crystalID?: number;
    deckString: string;
    initDeckString: string;
    deckClass: DeckClass;
    playerSessionId?: string;
    isBot: boolean;
}
export interface MatchEndRequest {
    matchID: number;
    status: MatchStatus;
    winningPlayer?: number;
    player1DeckString: string;
    player2DeckString: string;
    player1Moves: number;
    player2Moves: number;
    turnNonce: number;
    metrics: {
        [key: string]: any;
    };
    endedAt?: string;
    player1SessionId?: string;
    player2SessionId?: string;
}
export interface BotMatchEndRequest {
    mode?: GameMode;
    status: MatchStatus;
    winningPlayer?: number;
    deckString: string;
    turnNonce: number;
    matchStartedAt: string;
    metrics: {
        [key: string]: any;
    };
    playerSessionId?: string;
    playerAddress?: string;
}
export interface RankData {
    rank: PlayerRank;
    rankStage: PlayerRankStage;
    requiredRankPoints: number;
    rankPosition: number;
    score: number;
    scoreAbove: number;
    scoreBelow: number;
}
export interface RewardRank {
    beforeMatch: RankData;
    afterMatch: RankData;
}
export interface RewardExp {
    amount: number;
    description: string;
    currentLevel: number;
    requiredExp: number;
}
export interface RewardCard {
    amount: number;
    description: string;
    card: Card;
    item?: Item;
}
export interface RewardHero {
    hero: Hero;
    deckClass: DeckClass;
}
export interface RewardHeroSkin {
    hero: Hero;
    deckClass: DeckClass;
    tokenId: number;
}
export interface RewardDeck {
    deckClass: DeckClass;
    tokenIds: Array<number>;
}
export interface ConquestV2TreasureProgress {
    treasureLevel: number;
    treasurePoints: number;
    treasurePointsRequired: number;
}
export interface RewardConquestV2TreasureProgress {
    beforeMatch: ConquestV2TreasureProgress;
    afterMatch: ConquestV2TreasureProgress;
}
export interface Reward {
    accountAddress: string;
    type: RewardType;
    gameMode?: GameMode;
    rank?: RewardRank;
    exp?: RewardExp;
    card?: RewardCard;
    hero?: RewardHero;
    heroSkin?: RewardHeroSkin;
    deck?: RewardDeck;
    conquestV2TreasureProgress?: RewardConquestV2TreasureProgress;
}
export interface ListLeaderboardRequest {
    gameMode?: GameMode;
    region?: string;
    playerRank?: PlayerRank;
    playerNamePrefix?: string;
    season?: number;
}
export interface AccountLeaderboardRequest {
    gameMode: GameMode;
    accountAddress?: string;
    season?: number;
}
export interface LeaderboardEntry {
    account: Account;
    accountStat: AccountStat;
    rank: number;
    rankedSilverReward: number;
    rankedTicketReward: number;
}
export interface ListMatchesRequest {
    accountAddress?: string;
}
export interface GMListMatchesRequest {
    accountAddress?: string;
    modes?: Array<GameMode>;
    statuses?: Array<MatchStatus>;
    reviewed?: boolean;
    max_duration?: string;
    min_duration?: string;
}
export interface TaskRunner {
    id: number;
    workGroup: string;
    runAt: string;
}
export interface Task {
    id: number;
    queue: string;
    status: TaskStatus;
    try: number;
    runAt?: string;
    lastRanAt?: string;
    createdAt?: string;
    payload: Array<string>;
    hash?: string;
    accountAddress?: string;
}
export interface GameClientFeedback {
    sentiment: string;
    timestamp: string;
    dump: {
        [key: string]: any;
    };
    screenshotImageURI: string;
}
export interface CookiePolicy {
    id: number;
    accountAddress: string;
    policy: {
        [key: string]: boolean;
    };
    createdAt?: string;
}
export interface Conquest {
    id: number;
    status: ConquestStatus;
    accountAddress: string;
    nonce: number;
    mode: GameMode;
    hero: Hero;
    deckClass?: DeckClass;
    matchProgress: {
        [key: number]: ConquestMatchResult;
    };
    createdAt?: string;
    endedAt?: string;
}
export interface ConquestStats {
    discoveryTicketsUsed: number;
    constructedTicketsUsed: number;
    discoveryMatchesPlayed: number;
    constructedMatchesPlayed: number;
    discoveryWinRate: number;
    constructedWinRate: number;
    discoverySilverCardsWon: number;
    constructedSilverCardsWon: number;
    discoveryGoldCardsWon: number;
    constructedGoldCardsWon: number;
    firstConquestMatchPlayed: string;
}
export interface ConquestPoints {
    address: string;
    eventID: number;
    currentPoints: number;
    totalPoints: number;
}
export interface MigrateAccountRequest {
    proof: WalletProof;
    accountName?: string;
}
export interface IAPPurchaseRequest {
    productId: string;
    transactionId?: string;
    transactionDate: number;
    transactionReceipt: string;
    purchaseToken?: string;
    quantityIOS?: number;
    originalTransactionDateIOS?: string;
    originalTransactionIdentifierIOS?: string;
    dataAndroid?: string;
    signatureAndroid?: string;
    autoRenewingAndroid?: boolean;
    purchaseStateAndroid?: PurchaseStateAndroid;
    isAcknowledgedAndroid?: boolean;
    packageNameAndroid?: string;
    developerPayloadAndroid?: string;
    obfuscatedAccountIdAndroid?: string;
    obfuscatedProfileIdAndroid?: string;
    userIdAmazon?: string;
    userMarketplaceAmazon?: string;
    userJsonAmazon?: string;
    isCanceledAmazon?: boolean;
    address: string;
    currency: string;
    totalPrice: number;
    pricePerUnit: number;
    receiptData?: string;
    quantity: number;
}
export interface IAPProduct {
    purchaseToken: string;
    address: string;
    storeProductId: string;
    status: IAPTransactionStatus;
    token: string;
    quantity?: number;
    minted: boolean;
    tokenAmount: number;
    totalPrice?: number;
    transactionId?: string;
    transactionDate?: number;
    currency?: string;
    pricePerUnit?: number;
}
export interface AppleIAP {
    ProductID: string;
    TransactionID: string;
    Quantity: string;
}
export interface AppleIAPResponse {
    Status: number;
    Environment: string;
    AppItemID: number;
    BundleID: string;
    LatestReceiptInfo: Array<AppleIAP>;
    LatestReceipt: string;
    IsRetryable: boolean;
}
export interface GoogleProductPurchase {
    AcknowledgementState: number;
    ConsumptionState: number;
    DeveloperPayload: string;
    Kind: string;
    ObfuscatedExternalAccountId: string;
    ObfuscatedExternalProfileId: string;
    OrderId: string;
    ProductId: string;
    PurchaseState: number;
    PurchaseTimeMillis: number;
    PurchaseToken: string;
    PurchaseType?: number;
    Quantity: number;
    RegionCode: string;
    ForceSendFields: Array<string>;
    NullFields: Array<string>;
}
export interface AccountAction {
    id: number;
    accountAddress: string;
    createdAt?: string;
    updatedAt?: string;
    expiresAt?: string;
    actionType: ActionType;
    isActive: boolean;
    createdBy?: string;
}
export interface AccountSignal {
    id: number;
    accountAddress: string;
    signalType: string;
    signalStatus: SignalStatus;
    createdAt: string;
    updatedAt: string;
    signalData: any;
    score: number;
}
export interface AccountSignalSummary {
    accountAddress: string;
    score: number;
    updatedAt: string;
    account?: Account;
    accountActions?: Array<AccountAction>;
}
export interface Report {
    reportedAddress: string;
    matchId: number;
    reporterComment: string;
}
export interface AppDevKey {
    id: number;
    appKey: string;
    name: string;
    email: string;
    disabled: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface Page {
    pageSize?: number;
    before?: string;
    hasBefore?: boolean;
    after?: string;
    hasAfter?: boolean;
    sort?: Array<SortBy>;
}
export interface SortBy {
    column: string;
    order: SortOrder;
}
export interface TwitchFeaturedStreamer {
    username: string;
}
export interface GMStatsResponse {
    total_active_users: number;
    total_suspended_users: number;
    total_banned_users: number;
    total_vip_users: number;
    total_flagged_users: number;
    total_to_delete_users: number;
}
export interface Banner {
    order: number;
    type: BannerType;
    color?: string;
    msg: string;
    dismissable: boolean;
    id: number;
    link?: string;
    startAt?: string;
    endAt?: string;
}
export interface BannersRequest {
    order: number;
    bannerType: BannerType;
    msg: string;
    dismissable: boolean;
    color?: string;
    link?: string;
    startAt?: string;
    endAt?: string;
}
export interface TwitchInfoResponse {
    streamers_online: number;
    vods_available: number;
    streams: Array<TwitchStream>;
}
export interface TwitchStream {
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: string;
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids: Array<string>;
    is_mature: boolean;
}
export interface DiscordInfoResponse {
    users_online: number;
    instant_invite_url: string;
}
export interface GameModesStatus {
    tutorial: boolean;
    practice: boolean;
    warmUp: boolean;
    rankedConstructed: boolean;
    rankedDiscovery: boolean;
    conquestConstructed: boolean;
    conquestDiscovery: boolean;
    challengeConstructed: boolean;
    challengeDiscovery: boolean;
}
export interface GameModeStatus {
    gameMode: GameMode;
    enabled: boolean;
}
export interface GameModeStatusHistory {
    id: number;
    accountAddress: string;
    gameMode: GameMode;
    enabled: boolean;
    createdAt: string;
}
export interface ConquestV2Pool {
    amount: number;
    totalWeight: number;
}
export interface ConquestV2PoolConfigData {
    maxPoolCeiling?: number;
    poolCeiling: number;
    poolFloor: number;
    topWeightUnitPrice: number;
    bottomWeightUnitPrice: number;
}
export interface ConquestV2PoolConfig {
    default: ConquestV2PoolConfigData;
    settings: ConquestV2PoolConfigData;
    final: ConquestV2PoolConfigData;
}
export interface ConquestV2TreasureLevelSummary {
    level: number;
    numberOfPlayers: number;
    totalWeight: number;
}
export interface ConquestV2Summary {
    pool: number;
    totalWeight: number;
    weightUnitPrice: number;
    treasureLevels: Array<ConquestV2TreasureLevelSummary>;
}
export interface ConquestV2AccountTreasureProgress {
    accountAddress: string;
    accountName: string;
    progress: ConquestV2TreasureProgress;
}
export interface Notification {
    id: number;
    accountAddress: string;
    type: NotificationType;
    leaderboardReward?: NotificationLeaderboardReward;
    conquestV2Reward?: NotificationConquestV2Reward;
    seasonStart?: NotificationSeasonStart;
}
export interface NotificationLeaderboardReward {
    season: number;
    week: number;
    silverCardAmounts: {
        [key: number]: number;
    };
    ticketAmount: number;
    rankedConstructedRank: number;
    rankedDiscoveryRank: number;
}
export interface NotificationConquestV2Reward {
    season: number;
    week: number;
    treasureLevel: number;
    amountUSDC: number;
}
export interface NotificationSeasonStart {
    seasonNumber: number;
    seasonName: string;
}
export interface ListSkypassRewardsResponse {
    levels: Array<SkypassLevel>;
    seasonNumber: number;
    seasonName: string;
    hasPremium: boolean;
}
export interface SkypassLevel {
    level: number;
    earned: boolean;
    rewards: Array<SkypassReward>;
}
export interface SkypassReward {
    id: number;
    level: number;
    season: number;
    tier: SkypassTier;
    type: SkypassRewardType;
    amount: number;
    attributes: SkypassRewardAttributes;
    claimable: boolean;
    claimed: boolean;
}
export interface SkypassRewardAttributes {
    tokenIDs: Array<number>;
    heroes: Array<Hero>;
}
export interface SkyWeaverAPI {
    getAuthToken(args: GetAuthTokenArgs, headers?: object): Promise<GetAuthTokenReturn>;
    getSession(headers?: object): Promise<GetSessionReturn>;
    migrateAccount(args: MigrateAccountArgs, headers?: object): Promise<MigrateAccountReturn>;
    registerAccount(args: RegisterAccountArgs, headers?: object): Promise<RegisterAccountReturn>;
    getAccount(args: GetAccountArgs, headers?: object): Promise<GetAccountReturn>;
    getAccountByUsername(args: GetAccountByUsernameArgs, headers?: object): Promise<GetAccountByUsernameReturn>;
    getAccountStats(args: GetAccountStatsArgs, headers?: object): Promise<GetAccountStatsReturn>;
    accountExists(args: AccountExistsArgs, headers?: object): Promise<AccountExistsReturn>;
    accountExistsByName(args: AccountExistsByNameArgs, headers?: object): Promise<AccountExistsByNameReturn>;
    updateAccount(args: UpdateAccountArgs, headers?: object): Promise<UpdateAccountReturn>;
    requestAccountDeletion(args: RequestAccountDeletionArgs, headers?: object): Promise<RequestAccountDeletionReturn>;
    requestMoreInvites(headers?: object): Promise<RequestMoreInvitesReturn>;
    setInvitedBy(args: SetInvitedByArgs, headers?: object): Promise<SetInvitedByReturn>;
    getPrivateSpectateCode(args: GetPrivateSpectateCodeArgs, headers?: object): Promise<GetPrivateSpectateCodeReturn>;
    listNotifications(headers?: object): Promise<ListNotificationsReturn>;
    setNotificationsAsSeen(args: SetNotificationsAsSeenArgs, headers?: object): Promise<SetNotificationsAsSeenReturn>;
    getFriendPoints(args: GetFriendPointsArgs, headers?: object): Promise<GetFriendPointsReturn>;
    getFriendPointsBySeason(args: GetFriendPointsBySeasonArgs, headers?: object): Promise<GetFriendPointsBySeasonReturn>;
    getPointsGifted(args: GetPointsGiftedArgs, headers?: object): Promise<GetPointsGiftedReturn>;
    getStickers(headers?: object): Promise<GetStickersReturn>;
    getStickersBySeason(args: GetStickersBySeasonArgs, headers?: object): Promise<GetStickersBySeasonReturn>;
    getStickerOwnership(args: GetStickerOwnershipArgs, headers?: object): Promise<GetStickerOwnershipReturn>;
    userStorageFetch(args: UserStorageFetchArgs, headers?: object): Promise<UserStorageFetchReturn>;
    userStorageSave(args: UserStorageSaveArgs, headers?: object): Promise<UserStorageSaveReturn>;
    userStorageDelete(args: UserStorageDeleteArgs, headers?: object): Promise<UserStorageDeleteReturn>;
    userStorageFetchAll(args: UserStorageFetchAllArgs, headers?: object): Promise<UserStorageFetchAllReturn>;
    getFeed(args: GetFeedArgs, headers?: object): Promise<GetFeedReturn>;
    getItemSummary(args: GetItemSummaryArgs, headers?: object): Promise<GetItemSummaryReturn>;
    getItemSupply(args: GetItemSupplyArgs, headers?: object): Promise<GetItemSupplyReturn>;
    getBatchItemSupply(args: GetBatchItemSupplyArgs, headers?: object): Promise<GetBatchItemSupplyReturn>;
    getItemSuppliesByType(args: GetItemSuppliesByTypeArgs, headers?: object): Promise<GetItemSuppliesByTypeReturn>;
    getItemOwnershipByType(args: GetItemOwnershipByTypeArgs, headers?: object): Promise<GetItemOwnershipByTypeReturn>;
    markItemsNotNew(args: MarkItemsNotNewArgs, headers?: object): Promise<MarkItemsNotNewReturn>;
    getCardLibrary(args: GetCardLibraryArgs, headers?: object): Promise<GetCardLibraryReturn>;
    getCardsByID(args: GetCardsByIDArgs, headers?: object): Promise<GetCardsByIDReturn>;
    getCardsByDeckString(args: GetCardsByDeckStringArgs, headers?: object): Promise<GetCardsByDeckStringReturn>;
    searchCards(args: SearchCardsArgs, headers?: object): Promise<SearchCardsReturn>;
    getCardOwnership(args: GetCardOwnershipArgs, headers?: object): Promise<GetCardOwnershipReturn>;
    getPendingCards(headers?: object): Promise<GetPendingCardsReturn>;
    listDecks(args: ListDecksArgs, headers?: object): Promise<ListDecksReturn>;
    searchDecks(args: SearchDecksArgs, headers?: object): Promise<SearchDecksReturn>;
    createDeck(args: CreateDeckArgs, headers?: object): Promise<CreateDeckReturn>;
    updateDeck(args: UpdateDeckArgs, headers?: object): Promise<UpdateDeckReturn>;
    favoriteDeck(args: FavoriteDeckArgs, headers?: object): Promise<FavoriteDeckReturn>;
    unfavoriteDeck(args: UnfavoriteDeckArgs, headers?: object): Promise<UnfavoriteDeckReturn>;
    toggleDeckFavorite(args: ToggleDeckFavoriteArgs, headers?: object): Promise<ToggleDeckFavoriteReturn>;
    getDeck(args: GetDeckArgs, headers?: object): Promise<GetDeckReturn>;
    checkDeck(args: CheckDeckArgs, headers?: object): Promise<CheckDeckReturn>;
    deleteDeck(args: DeleteDeckArgs, headers?: object): Promise<DeleteDeckReturn>;
    searchDeckRanks(args: SearchDeckRanksArgs, headers?: object): Promise<SearchDeckRanksReturn>;
    listDeckRanks(args: ListDeckRanksArgs, headers?: object): Promise<ListDeckRanksReturn>;
    markDeckNotNew(args: MarkDeckNotNewArgs, headers?: object): Promise<MarkDeckNotNewReturn>;
    listLeaderboard(args: ListLeaderboardArgs, headers?: object): Promise<ListLeaderboardReturn>;
    listMatches(args: ListMatchesArgs, headers?: object): Promise<ListMatchesReturn>;
    getMatch(args: GetMatchArgs, headers?: object): Promise<GetMatchReturn>;
    getCurrentSeason(headers?: object): Promise<GetCurrentSeasonReturn>;
    getNextRewardsTime(headers?: object): Promise<GetNextRewardsTimeReturn>;
    getNextSeasonTime(headers?: object): Promise<GetNextSeasonTimeReturn>;
    getCurrentSeasonStartTime(headers?: object): Promise<GetCurrentSeasonStartTimeReturn>;
    accountLeaderboard(args: AccountLeaderboardArgs, headers?: object): Promise<AccountLeaderboardReturn>;
    getMatchArchiveRecordsURI(args: GetMatchArchiveRecordsURIArgs, headers?: object): Promise<GetMatchArchiveRecordsURIReturn>;
    getMatchLiveRecordsURI(args: GetMatchLiveRecordsURIArgs, headers?: object): Promise<GetMatchLiveRecordsURIReturn>;
    botMatchEnd(args: BotMatchEndArgs, headers?: object): Promise<BotMatchEndReturn>;
    internalMatchStart(args: InternalMatchStartArgs, headers?: object): Promise<InternalMatchStartReturn>;
    internalMatchEnd(args: InternalMatchEndArgs, headers?: object): Promise<InternalMatchEndReturn>;
    internalAppendMatchArchiveRecords(args: InternalAppendMatchArchiveRecordsArgs, headers?: object): Promise<InternalAppendMatchArchiveRecordsReturn>;
    internalAppendMatchLiveRecords(args: InternalAppendMatchLiveRecordsArgs, headers?: object): Promise<InternalAppendMatchLiveRecordsReturn>;
    internalConquestStatus(args: InternalConquestStatusArgs, headers?: object): Promise<InternalConquestStatusReturn>;
    internalGetAccount(args: InternalGetAccountArgs, headers?: object): Promise<InternalGetAccountReturn>;
    internalGetPrivateSpectateCode(args: InternalGetPrivateSpectateCodeArgs, headers?: object): Promise<InternalGetPrivateSpectateCodeReturn>;
    enterConquest(args: EnterConquestArgs, headers?: object): Promise<EnterConquestReturn>;
    conquestStatus(headers?: object): Promise<ConquestStatusReturn>;
    conquestStats(headers?: object): Promise<ConquestStatsReturn>;
    conquestRewards(headers?: object): Promise<ConquestRewardsReturn>;
    conquestPoints(headers?: object): Promise<ConquestPointsReturn>;
    conquestV2Pool(headers?: object): Promise<ConquestV2PoolReturn>;
    conquestV2Progress(headers?: object): Promise<ConquestV2ProgressReturn>;
    listSkypassRewards(args: ListSkypassRewardsArgs, headers?: object): Promise<ListSkypassRewardsReturn>;
    claimSkypassRewards(args: ClaimSkypassRewardsArgs, headers?: object): Promise<ClaimSkypassRewardsReturn>;
    iAPVerifyGoogleProducts(args: IAPVerifyGoogleProductsArgs, headers?: object): Promise<IAPVerifyGoogleProductsReturn>;
    iAPVerifyAppleProducts(args: IAPVerifyAppleProductsArgs, headers?: object): Promise<IAPVerifyAppleProductsReturn>;
    iAPVerifyGoogleProducts2(args: IAPVerifyGoogleProducts2Args, headers?: object): Promise<IAPVerifyGoogleProducts2Return>;
    iAPVerifyAppleProducts2(args: IAPVerifyAppleProducts2Args, headers?: object): Promise<IAPVerifyAppleProducts2Return>;
    joinEarlyAccessList(args: JoinEarlyAccessListArgs, headers?: object): Promise<JoinEarlyAccessListReturn>;
    recordGameClientFeedback(args: RecordGameClientFeedbackArgs, headers?: object): Promise<RecordGameClientFeedbackReturn>;
    heroUnlockLevels(headers?: object): Promise<HeroUnlockLevelsReturn>;
    deckClassUnlockLevels(headers?: object): Promise<DeckClassUnlockLevelsReturn>;
    availableXPBonuses(headers?: object): Promise<AvailableXPBonusesReturn>;
    reportAccount(args: ReportAccountArgs, headers?: object): Promise<ReportAccountReturn>;
    saveCookiePolicy(args: SaveCookiePolicyArgs, headers?: object): Promise<SaveCookiePolicyReturn>;
    getCookiePolicy(headers?: object): Promise<GetCookiePolicyReturn>;
    getDiscordInfo(headers?: object): Promise<GetDiscordInfoReturn>;
    getTwitchInfo(headers?: object): Promise<GetTwitchInfoReturn>;
    getFeaturedStreamers(headers?: object): Promise<GetFeaturedStreamersReturn>;
    gMAddFeaturedStreamer(args: GMAddFeaturedStreamerArgs, headers?: object): Promise<GMAddFeaturedStreamerReturn>;
    gMRemoveFeaturedStreamer(args: GMRemoveFeaturedStreamerArgs, headers?: object): Promise<GMRemoveFeaturedStreamerReturn>;
    getBanners(headers?: object): Promise<GetBannersReturn>;
    gMListBanners(headers?: object): Promise<GMListBannersReturn>;
    gMAddBanner(args: GMAddBannerArgs, headers?: object): Promise<GMAddBannerReturn>;
    gMModifyBanner(args: GMModifyBannerArgs, headers?: object): Promise<GMModifyBannerReturn>;
    gMRemoveBanner(args: GMRemoveBannerArgs, headers?: object): Promise<GMRemoveBannerReturn>;
    getGameModesStatus(headers?: object): Promise<GetGameModesStatusReturn>;
    adminListAccounts(args: AdminListAccountsArgs, headers?: object): Promise<AdminListAccountsReturn>;
    adminSearchAccounts(args: AdminSearchAccountsArgs, headers?: object): Promise<AdminSearchAccountsReturn>;
    gMFindAccount(args: GMFindAccountArgs, headers?: object): Promise<GMFindAccountReturn>;
    gMRenameAccount(args: GMRenameAccountArgs, headers?: object): Promise<GMRenameAccountReturn>;
    gMUnlockAllBaseCards(args: GMUnlockAllBaseCardsArgs, headers?: object): Promise<GMUnlockAllBaseCardsReturn>;
    gMGiveLevels(args: GMGiveLevelsArgs, headers?: object): Promise<GMGiveLevelsReturn>;
    gMSetRP(args: GMSetRPArgs, headers?: object): Promise<GMSetRPReturn>;
    gMSetWarmupGamesCompleted(args: GMSetWarmupGamesCompletedArgs, headers?: object): Promise<GMSetWarmupGamesCompletedReturn>;
    gMListAccountActions(args: GMListAccountActionsArgs, headers?: object): Promise<GMListAccountActionsReturn>;
    gMCreateAccountAction(args: GMCreateAccountActionArgs, headers?: object): Promise<GMCreateAccountActionReturn>;
    gMIsAccountBanned(args: GMIsAccountBannedArgs, headers?: object): Promise<GMIsAccountBannedReturn>;
    gMListAccountSignals(args: GMListAccountSignalsArgs, headers?: object): Promise<GMListAccountSignalsReturn>;
    gMAccountSignalSummaries(args: GMAccountSignalSummariesArgs, headers?: object): Promise<GMAccountSignalSummariesReturn>;
    gMListAccounts(args: GMListAccountsArgs, headers?: object): Promise<GMListAccountsReturn>;
    gMListMatches(args: GMListMatchesArgs, headers?: object): Promise<GMListMatchesReturn>;
    gMSetReviewed(args: GMSetReviewedArgs, headers?: object): Promise<GMSetReviewedReturn>;
    gMListPendingCards(args: GMListPendingCardsArgs, headers?: object): Promise<GMListPendingCardsReturn>;
    gMStats(headers?: object): Promise<GMStatsReturn>;
    gMGameModeSet(args: GMGameModeSetArgs, headers?: object): Promise<GMGameModeSetReturn>;
    gMGameModeStatusHistory(args: GMGameModeStatusHistoryArgs, headers?: object): Promise<GMGameModeStatusHistoryReturn>;
    gMSetConquestV2PoolConfig(args: GMSetConquestV2PoolConfigArgs, headers?: object): Promise<GMSetConquestV2PoolConfigReturn>;
    gMGetConquestV2PoolConfig(headers?: object): Promise<GMGetConquestV2PoolConfigReturn>;
    gMGetConquestV2Summary(headers?: object): Promise<GMGetConquestV2SummaryReturn>;
    gMListConquestV2AccountTreasureProgress(args: GMListConquestV2AccountTreasureProgressArgs, headers?: object): Promise<GMListConquestV2AccountTreasureProgressReturn>;
    gMAppDevKeyCreate(args: GMAppDevKeyCreateArgs, headers?: object): Promise<GMAppDevKeyCreateReturn>;
    gMAppDevKeyFind(args: GMAppDevKeyFindArgs, headers?: object): Promise<GMAppDevKeyFindReturn>;
    ping(headers?: object): Promise<PingReturn>;
    version(headers?: object): Promise<VersionReturn>;
}
export interface GetAuthTokenArgs {
    ethAuthProofString: string;
}
export interface GetAuthTokenReturn {
    status: boolean;
    jwtToken: string;
    address: string;
    account?: Account;
}
export interface GetSessionArgs {
}
export interface GetSessionReturn {
    address: string;
    account?: Account;
}
export interface MigrateAccountArgs {
    req: MigrateAccountRequest;
}
export interface MigrateAccountReturn {
    ok: boolean;
}
export interface RegisterAccountArgs {
    accountRegistration: AccountRegistration;
    captcha: string;
}
export interface RegisterAccountReturn {
    status: boolean;
    account: Account;
}
export interface GetAccountArgs {
    address: string;
}
export interface GetAccountReturn {
    account: Account;
}
export interface GetAccountByUsernameArgs {
    username: string;
}
export interface GetAccountByUsernameReturn {
    account: Account;
}
export interface GetAccountStatsArgs {
    address: string;
    seasons?: Array<number>;
}
export interface GetAccountStatsReturn {
    constructedStats: Array<AccountStat>;
    discoveryStats: Array<AccountStat>;
}
export interface AccountExistsArgs {
    address: string;
}
export interface AccountExistsReturn {
    exists: boolean;
    pending_migration: boolean;
}
export interface AccountExistsByNameArgs {
    name: string;
}
export interface AccountExistsByNameReturn {
    exists: boolean;
    pending_migration: boolean;
}
export interface UpdateAccountArgs {
    account: Account;
}
export interface UpdateAccountReturn {
    account: Account;
}
export interface RequestAccountDeletionArgs {
    proof: WalletProof;
}
export interface RequestAccountDeletionReturn {
    status: boolean;
}
export interface RequestMoreInvitesArgs {
}
export interface RequestMoreInvitesReturn {
    status: boolean;
}
export interface SetInvitedByArgs {
    req: SetInvitedByRequest;
}
export interface SetInvitedByReturn {
    ok: boolean;
}
export interface GetPrivateSpectateCodeArgs {
    reset?: boolean;
}
export interface GetPrivateSpectateCodeReturn {
    code: string;
}
export interface ListNotificationsArgs {
}
export interface ListNotificationsReturn {
    notifications: Array<Notification>;
}
export interface SetNotificationsAsSeenArgs {
    notificationIDs: Array<number>;
}
export interface SetNotificationsAsSeenReturn {
    status: boolean;
}
export interface GetFriendPointsArgs {
    address: string;
}
export interface GetFriendPointsReturn {
    total: number;
    friends: Array<FriendPoints>;
}
export interface GetFriendPointsBySeasonArgs {
    address: string;
    season: number;
}
export interface GetFriendPointsBySeasonReturn {
    total: number;
    friends: Array<FriendPoints>;
}
export interface GetPointsGiftedArgs {
    address: string;
}
export interface GetPointsGiftedReturn {
    total: number;
    inviter: Account;
}
export interface GetStickersArgs {
}
export interface GetStickersReturn {
    stickers: Array<Sticker>;
}
export interface GetStickersBySeasonArgs {
    season: number;
}
export interface GetStickersBySeasonReturn {
    stickers: Array<Sticker>;
}
export interface GetStickerOwnershipArgs {
    accountAddress?: string;
}
export interface GetStickerOwnershipReturn {
    res: StickerOwnershipResponse;
}
export interface UserStorageFetchArgs {
    key: string;
}
export interface UserStorageFetchReturn {
    object: any;
}
export interface UserStorageSaveArgs {
    key: string;
    object: any;
}
export interface UserStorageSaveReturn {
    ok: boolean;
}
export interface UserStorageDeleteArgs {
    key: string;
}
export interface UserStorageDeleteReturn {
    ok: boolean;
}
export interface UserStorageFetchAllArgs {
    keys?: Array<string>;
}
export interface UserStorageFetchAllReturn {
    objects: {
        [key: string]: any;
    };
}
export interface GetFeedArgs {
    page?: Page;
    req: GetFeedRequest;
}
export interface GetFeedReturn {
    page?: Page;
    res: Array<FeedEvent>;
}
export interface GetItemSummaryArgs {
    accountAddress: string;
    contractQuery?: boolean;
}
export interface GetItemSummaryReturn {
    summary: {
        [key: string]: ItemSummary;
    };
}
export interface GetItemSupplyArgs {
    tokenID: number;
}
export interface GetItemSupplyReturn {
    summary: {
        [key: string]: Item;
    };
}
export interface GetBatchItemSupplyArgs {
    tokenIDs: Array<number>;
}
export interface GetBatchItemSupplyReturn {
    summary: {
        [key: number]: {
            [key: string]: Item;
        };
    };
}
export interface GetItemSuppliesByTypeArgs {
    itemTypes: Array<ItemType>;
}
export interface GetItemSuppliesByTypeReturn {
    summary: {
        [key: number]: Array<ItemSupply>;
    };
}
export interface GetItemOwnershipByTypeArgs {
    accountAddress?: string;
    itemTypes?: Array<ItemType>;
}
export interface GetItemOwnershipByTypeReturn {
    items: Array<Item>;
}
export interface MarkItemsNotNewArgs {
    tokenIDs: Array<number>;
    immediately?: boolean;
}
export interface MarkItemsNotNewReturn {
    ok: boolean;
}
export interface GetCardLibraryArgs {
    page?: Page;
}
export interface GetCardLibraryReturn {
    cards: Array<Card>;
}
export interface GetCardsByIDArgs {
    cardIDs: Array<number>;
}
export interface GetCardsByIDReturn {
    cards: Array<Card>;
}
export interface GetCardsByDeckStringArgs {
    deckString: string;
}
export interface GetCardsByDeckStringReturn {
    cards: Array<Card>;
}
export interface SearchCardsArgs {
    page?: Page;
    req: SearchCardsRequest;
}
export interface SearchCardsReturn {
    page?: Page;
    res: Array<CardWithBalance>;
}
export interface GetCardOwnershipArgs {
    accountAddress?: string;
    contractQuery?: boolean;
}
export interface GetCardOwnershipReturn {
    res: CardOwnershipResponse;
}
export interface GetPendingCardsArgs {
}
export interface GetPendingCardsReturn {
    res: Array<PendingCardsResponse>;
}
export interface ListDecksArgs {
    page?: Page;
}
export interface ListDecksReturn {
    page?: Page;
    res: Array<Deck>;
}
export interface SearchDecksArgs {
    page?: Page;
    req: SearchDecksRequest;
}
export interface SearchDecksReturn {
    page?: Page;
    res: Array<Deck>;
}
export interface CreateDeckArgs {
    req: CreateDeckRequest;
}
export interface CreateDeckReturn {
    res: Deck;
}
export interface UpdateDeckArgs {
    req: UpdateDeckRequest;
}
export interface UpdateDeckReturn {
    res: Deck;
}
export interface FavoriteDeckArgs {
    uuid: string;
}
export interface FavoriteDeckReturn {
    ok: boolean;
}
export interface UnfavoriteDeckArgs {
    uuid: string;
}
export interface UnfavoriteDeckReturn {
    ok: boolean;
}
export interface ToggleDeckFavoriteArgs {
    uuid: string;
}
export interface ToggleDeckFavoriteReturn {
    isFavorite: boolean;
}
export interface GetDeckArgs {
    req: DeckRequest;
}
export interface GetDeckReturn {
    res: Deck;
}
export interface CheckDeckArgs {
    req: CheckDeckRequest;
}
export interface CheckDeckReturn {
    res: CheckDeckResponse;
}
export interface DeleteDeckArgs {
    req: DeckRequest;
}
export interface DeleteDeckReturn {
    ok: boolean;
}
export interface SearchDeckRanksArgs {
    page?: Page;
    req: SearchDeckRanksRequest;
}
export interface SearchDeckRanksReturn {
    page?: Page;
    res: Array<DeckRank>;
}
export interface ListDeckRanksArgs {
    page?: Page;
    req: ListDeckRanksRequest;
}
export interface ListDeckRanksReturn {
    page?: Page;
    res: Array<DeckRankAccount>;
}
export interface MarkDeckNotNewArgs {
    uuid: string;
}
export interface MarkDeckNotNewReturn {
    ok: boolean;
}
export interface ListLeaderboardArgs {
    page?: Page;
    req: ListLeaderboardRequest;
}
export interface ListLeaderboardReturn {
    page?: Page;
    res: Array<LeaderboardEntry>;
}
export interface ListMatchesArgs {
    page?: Page;
    req: ListMatchesRequest;
}
export interface ListMatchesReturn {
    page?: Page;
    res: Array<Match>;
}
export interface GetMatchArgs {
    matchID: number;
}
export interface GetMatchReturn {
    match: Match;
}
export interface GetCurrentSeasonArgs {
}
export interface GetCurrentSeasonReturn {
    res: number;
}
export interface GetNextRewardsTimeArgs {
}
export interface GetNextRewardsTimeReturn {
    res: string;
}
export interface GetNextSeasonTimeArgs {
}
export interface GetNextSeasonTimeReturn {
    res: string;
}
export interface GetCurrentSeasonStartTimeArgs {
}
export interface GetCurrentSeasonStartTimeReturn {
    res: string;
}
export interface AccountLeaderboardArgs {
    page?: Page;
    req: AccountLeaderboardRequest;
}
export interface AccountLeaderboardReturn {
    page?: Page;
    res: Array<LeaderboardEntry>;
}
export interface GetMatchArchiveRecordsURIArgs {
    matchID: number;
    replayID: string;
}
export interface GetMatchArchiveRecordsURIReturn {
    ok: boolean;
    match?: Match;
    archiveIndexURI: string;
    recordURIs: Array<string>;
}
export interface GetMatchLiveRecordsURIArgs {
    matchID: number;
}
export interface GetMatchLiveRecordsURIReturn {
    ok: boolean;
    match?: Match;
    liveIndexURI: string;
}
export interface BotMatchEndArgs {
    req: BotMatchEndRequest;
}
export interface BotMatchEndReturn {
    rewards: Array<Reward>;
}
export interface InternalMatchStartArgs {
    req: MatchStartRequest;
}
export interface InternalMatchStartReturn {
    matchID: number;
    replayID: string;
}
export interface InternalMatchEndArgs {
    req: MatchEndRequest;
}
export interface InternalMatchEndReturn {
    rewards: Array<Reward>;
}
export interface InternalAppendMatchArchiveRecordsArgs {
    matchID: number;
    index: number;
    jsonStringData: string;
}
export interface InternalAppendMatchArchiveRecordsReturn {
    status: boolean;
    uri: string;
}
export interface InternalAppendMatchLiveRecordsArgs {
    matchID: number;
    index: number;
    jsonStringData: string;
}
export interface InternalAppendMatchLiveRecordsReturn {
    status: boolean;
    uri: string;
}
export interface InternalConquestStatusArgs {
    address: string;
}
export interface InternalConquestStatusReturn {
    conquest: Conquest;
}
export interface InternalGetAccountArgs {
    address: string;
}
export interface InternalGetAccountReturn {
    account: Account;
}
export interface InternalGetPrivateSpectateCodeArgs {
    address: string;
}
export interface InternalGetPrivateSpectateCodeReturn {
    code: string;
}
export interface EnterConquestArgs {
    hero: Hero;
}
export interface EnterConquestReturn {
    status: boolean;
}
export interface ConquestStatusArgs {
}
export interface ConquestStatusReturn {
    conquest: Conquest;
}
export interface ConquestStatsArgs {
}
export interface ConquestStatsReturn {
    stats: ConquestStats;
}
export interface ConquestRewardsArgs {
}
export interface ConquestRewardsReturn {
    weeklyGolds: Array<WeeklyGolds>;
}
export interface ConquestPointsArgs {
}
export interface ConquestPointsReturn {
    points: number;
    nedeed: number;
}
export interface ConquestV2PoolArgs {
}
export interface ConquestV2PoolReturn {
    pool: ConquestV2Pool;
}
export interface ConquestV2ProgressArgs {
}
export interface ConquestV2ProgressReturn {
    progress: ConquestV2TreasureProgress;
}
export interface ListSkypassRewardsArgs {
    season?: number;
}
export interface ListSkypassRewardsReturn {
    res: ListSkypassRewardsResponse;
}
export interface ClaimSkypassRewardsArgs {
    ids: Array<number>;
}
export interface ClaimSkypassRewardsReturn {
    status: boolean;
}
export interface IAPVerifyGoogleProductsArgs {
    packageName: string;
    productId: string;
    token: string;
    address: string;
}
export interface IAPVerifyGoogleProductsReturn {
    productPurchase: GoogleProductPurchase;
}
export interface IAPVerifyAppleProductsArgs {
    receiptData: string;
    transactionId: string;
    productId: string;
    address: string;
}
export interface IAPVerifyAppleProductsReturn {
    applePurchase: AppleIAPResponse;
}
export interface IAPVerifyGoogleProducts2Args {
    req: IAPPurchaseRequest;
}
export interface IAPVerifyGoogleProducts2Return {
    productPurchase: GoogleProductPurchase;
}
export interface IAPVerifyAppleProducts2Args {
    req: IAPPurchaseRequest;
}
export interface IAPVerifyAppleProducts2Return {
    applePurchase: AppleIAPResponse;
}
export interface JoinEarlyAccessListArgs {
    emailAddress: string;
}
export interface JoinEarlyAccessListReturn {
    status: boolean;
    serviceError: string;
}
export interface RecordGameClientFeedbackArgs {
    req: GameClientFeedback;
}
export interface RecordGameClientFeedbackReturn {
    status: boolean;
}
export interface HeroUnlockLevelsArgs {
}
export interface HeroUnlockLevelsReturn {
    res: {
        [key: string]: number;
    };
}
export interface DeckClassUnlockLevelsArgs {
}
export interface DeckClassUnlockLevelsReturn {
    res: {
        [key: string]: number;
    };
}
export interface AvailableXPBonusesArgs {
}
export interface AvailableXPBonusesReturn {
    res: number;
}
export interface ReportAccountArgs {
    report: Report;
}
export interface ReportAccountReturn {
    ok: boolean;
}
export interface SaveCookiePolicyArgs {
    cookieOptions: {
        [key: string]: boolean;
    };
}
export interface SaveCookiePolicyReturn {
    status: boolean;
}
export interface GetCookiePolicyArgs {
}
export interface GetCookiePolicyReturn {
    res: {
        [key: string]: boolean;
    };
}
export interface GetDiscordInfoArgs {
}
export interface GetDiscordInfoReturn {
    data: DiscordInfoResponse;
}
export interface GetTwitchInfoArgs {
}
export interface GetTwitchInfoReturn {
    data: TwitchInfoResponse;
}
export interface GetFeaturedStreamersArgs {
}
export interface GetFeaturedStreamersReturn {
    streamers: Array<TwitchFeaturedStreamer>;
}
export interface GMAddFeaturedStreamerArgs {
    streamer: TwitchFeaturedStreamer;
}
export interface GMAddFeaturedStreamerReturn {
    status: boolean;
}
export interface GMRemoveFeaturedStreamerArgs {
    streamer: TwitchFeaturedStreamer;
}
export interface GMRemoveFeaturedStreamerReturn {
    status: boolean;
}
export interface GetBannersArgs {
}
export interface GetBannersReturn {
    banners: Array<Banner>;
}
export interface GMListBannersArgs {
}
export interface GMListBannersReturn {
    banners: Array<Banner>;
}
export interface GMAddBannerArgs {
    bannersRequest: BannersRequest;
}
export interface GMAddBannerReturn {
    status: boolean;
}
export interface GMModifyBannerArgs {
    banner: Banner;
}
export interface GMModifyBannerReturn {
    status: boolean;
}
export interface GMRemoveBannerArgs {
    id: number;
}
export interface GMRemoveBannerReturn {
    status: boolean;
}
export interface GetGameModesStatusArgs {
}
export interface GetGameModesStatusReturn {
    status: GameModesStatus;
}
export interface AdminListAccountsArgs {
    page?: Page;
}
export interface AdminListAccountsReturn {
    page?: Page;
    accounts: Array<Account>;
}
export interface AdminSearchAccountsArgs {
    page?: Page;
    filterName: string;
    filterAvatar: string;
}
export interface AdminSearchAccountsReturn {
    page?: Page;
    accounts: Array<Account>;
}
export interface GMFindAccountArgs {
    name?: string;
    accountAddress?: string;
}
export interface GMFindAccountReturn {
    account: Account;
}
export interface GMRenameAccountArgs {
    oldName?: string;
    accountAddress?: string;
    newName: string;
    lockedUntil?: string;
}
export interface GMRenameAccountReturn {
    account: Account;
}
export interface GMUnlockAllBaseCardsArgs {
    accountAddress?: string;
}
export interface GMUnlockAllBaseCardsReturn {
    ok: boolean;
}
export interface GMGiveLevelsArgs {
    accountAddress?: string;
    levels: number;
}
export interface GMGiveLevelsReturn {
    ok: boolean;
}
export interface GMSetRPArgs {
    accountAddress?: string;
    mode: GameMode;
    rankPoints?: number;
}
export interface GMSetRPReturn {
    ok: boolean;
}
export interface GMSetWarmupGamesCompletedArgs {
    accountAddress?: string;
    numGamesCompleted: number;
}
export interface GMSetWarmupGamesCompletedReturn {
    ok: boolean;
}
export interface GMListAccountActionsArgs {
    page?: Page;
}
export interface GMListAccountActionsReturn {
    page?: Page;
    accountActions: Array<AccountAction>;
}
export interface GMCreateAccountActionArgs {
    action: AccountAction;
}
export interface GMCreateAccountActionReturn {
    action: AccountAction;
}
export interface GMIsAccountBannedArgs {
    account: string;
}
export interface GMIsAccountBannedReturn {
    banned: boolean;
    status?: AccountStatus;
    accountActions: Array<AccountAction>;
}
export interface GMListAccountSignalsArgs {
    account?: string;
}
export interface GMListAccountSignalsReturn {
    signal: Array<AccountSignal>;
}
export interface GMAccountSignalSummariesArgs {
    page?: Page;
    accountStatus?: Array<AccountStatus>;
    createdBefore?: string;
    createdAfter?: string;
    accountAddress?: string;
}
export interface GMAccountSignalSummariesReturn {
    page?: Page;
    signals: Array<AccountSignalSummary>;
}
export interface GMListAccountsArgs {
    page?: Page;
    accountStatus?: Array<AccountStatus>;
    accountActions?: Array<AccountStatus>;
    createdBefore?: string;
    createdAfter?: string;
    conquestsUnlocked?: boolean;
}
export interface GMListAccountsReturn {
    page?: Page;
    accounts: Array<GMAccount>;
}
export interface GMListMatchesArgs {
    page?: Page;
    req: GMListMatchesRequest;
}
export interface GMListMatchesReturn {
    page?: Page;
    res: Array<GMMatch>;
}
export interface GMSetReviewedArgs {
    matchId: number;
    reviewed: boolean;
}
export interface GMSetReviewedReturn {
    ok: boolean;
}
export interface GMListPendingCardsArgs {
    page?: Page;
}
export interface GMListPendingCardsReturn {
    page?: Page;
    response: Array<GMPendingCardsReponse>;
}
export interface GMStatsArgs {
}
export interface GMStatsReturn {
    stats: GMStatsResponse;
}
export interface GMGameModeSetArgs {
    gameMode: GameMode;
    enable: boolean;
}
export interface GMGameModeSetReturn {
    ok: boolean;
}
export interface GMGameModeStatusHistoryArgs {
    page?: Page;
    gameModes?: Array<GameMode>;
}
export interface GMGameModeStatusHistoryReturn {
    page?: Page;
    statusHistory: Array<GameModeStatusHistory>;
}
export interface GMSetConquestV2PoolConfigArgs {
    poolCeiling?: number;
    poolFloor?: number;
    topWeightUnitPrice?: number;
    bottomWeightUnitPrice?: number;
}
export interface GMSetConquestV2PoolConfigReturn {
    ok: boolean;
}
export interface GMGetConquestV2PoolConfigArgs {
}
export interface GMGetConquestV2PoolConfigReturn {
    config: ConquestV2PoolConfig;
}
export interface GMGetConquestV2SummaryArgs {
}
export interface GMGetConquestV2SummaryReturn {
    summary: ConquestV2Summary;
}
export interface GMListConquestV2AccountTreasureProgressArgs {
    page?: Page;
}
export interface GMListConquestV2AccountTreasureProgressReturn {
    page?: Page;
    data: Array<ConquestV2AccountTreasureProgress>;
}
export interface GMAppDevKeyCreateArgs {
    appKey: string;
    name: string;
    email: string;
}
export interface GMAppDevKeyCreateReturn {
    appDevKey: AppDevKey;
}
export interface GMAppDevKeyFindArgs {
    appKey: string;
}
export interface GMAppDevKeyFindReturn {
    appDevKey: AppDevKey;
    jwtToken: string;
}
export interface PingArgs {
}
export interface PingReturn {
    status: boolean;
}
export interface VersionArgs {
}
export interface VersionReturn {
    version: Version;
}
export declare class SkyWeaverAPI implements SkyWeaverAPI {
    protected hostname: string;
    protected fetch: Fetch;
    protected path: string;
    constructor(hostname: string, fetch: Fetch);
    private url;
    getAuthToken: (args: GetAuthTokenArgs, headers?: object | undefined) => Promise<GetAuthTokenReturn>;
    getSession: (headers?: object | undefined) => Promise<GetSessionReturn>;
    migrateAccount: (args: MigrateAccountArgs, headers?: object | undefined) => Promise<MigrateAccountReturn>;
    registerAccount: (args: RegisterAccountArgs, headers?: object | undefined) => Promise<RegisterAccountReturn>;
    getAccount: (args: GetAccountArgs, headers?: object | undefined) => Promise<GetAccountReturn>;
    getAccountByUsername: (args: GetAccountByUsernameArgs, headers?: object | undefined) => Promise<GetAccountByUsernameReturn>;
    getAccountStats: (args: GetAccountStatsArgs, headers?: object | undefined) => Promise<GetAccountStatsReturn>;
    accountExists: (args: AccountExistsArgs, headers?: object | undefined) => Promise<AccountExistsReturn>;
    accountExistsByName: (args: AccountExistsByNameArgs, headers?: object | undefined) => Promise<AccountExistsByNameReturn>;
    updateAccount: (args: UpdateAccountArgs, headers?: object | undefined) => Promise<UpdateAccountReturn>;
    requestAccountDeletion: (args: RequestAccountDeletionArgs, headers?: object | undefined) => Promise<RequestAccountDeletionReturn>;
    requestMoreInvites: (headers?: object | undefined) => Promise<RequestMoreInvitesReturn>;
    setInvitedBy: (args: SetInvitedByArgs, headers?: object | undefined) => Promise<SetInvitedByReturn>;
    getPrivateSpectateCode: (args: GetPrivateSpectateCodeArgs, headers?: object | undefined) => Promise<GetPrivateSpectateCodeReturn>;
    listNotifications: (headers?: object | undefined) => Promise<ListNotificationsReturn>;
    setNotificationsAsSeen: (args: SetNotificationsAsSeenArgs, headers?: object | undefined) => Promise<SetNotificationsAsSeenReturn>;
    getFriendPoints: (args: GetFriendPointsArgs, headers?: object | undefined) => Promise<GetFriendPointsReturn>;
    getFriendPointsBySeason: (args: GetFriendPointsBySeasonArgs, headers?: object | undefined) => Promise<GetFriendPointsBySeasonReturn>;
    getPointsGifted: (args: GetPointsGiftedArgs, headers?: object | undefined) => Promise<GetPointsGiftedReturn>;
    getStickers: (headers?: object | undefined) => Promise<GetStickersReturn>;
    getStickersBySeason: (args: GetStickersBySeasonArgs, headers?: object | undefined) => Promise<GetStickersBySeasonReturn>;
    getStickerOwnership: (args: GetStickerOwnershipArgs, headers?: object | undefined) => Promise<GetStickerOwnershipReturn>;
    userStorageFetch: (args: UserStorageFetchArgs, headers?: object | undefined) => Promise<UserStorageFetchReturn>;
    userStorageSave: (args: UserStorageSaveArgs, headers?: object | undefined) => Promise<UserStorageSaveReturn>;
    userStorageDelete: (args: UserStorageDeleteArgs, headers?: object | undefined) => Promise<UserStorageDeleteReturn>;
    userStorageFetchAll: (args: UserStorageFetchAllArgs, headers?: object | undefined) => Promise<UserStorageFetchAllReturn>;
    getFeed: (args: GetFeedArgs, headers?: object | undefined) => Promise<GetFeedReturn>;
    getItemSummary: (args: GetItemSummaryArgs, headers?: object | undefined) => Promise<GetItemSummaryReturn>;
    getItemSupply: (args: GetItemSupplyArgs, headers?: object | undefined) => Promise<GetItemSupplyReturn>;
    getBatchItemSupply: (args: GetBatchItemSupplyArgs, headers?: object | undefined) => Promise<GetBatchItemSupplyReturn>;
    getItemSuppliesByType: (args: GetItemSuppliesByTypeArgs, headers?: object | undefined) => Promise<GetItemSuppliesByTypeReturn>;
    getItemOwnershipByType: (args: GetItemOwnershipByTypeArgs, headers?: object | undefined) => Promise<GetItemOwnershipByTypeReturn>;
    markItemsNotNew: (args: MarkItemsNotNewArgs, headers?: object | undefined) => Promise<MarkItemsNotNewReturn>;
    getCardLibrary: (args: GetCardLibraryArgs, headers?: object | undefined) => Promise<GetCardLibraryReturn>;
    getCardsByID: (args: GetCardsByIDArgs, headers?: object | undefined) => Promise<GetCardsByIDReturn>;
    getCardsByDeckString: (args: GetCardsByDeckStringArgs, headers?: object | undefined) => Promise<GetCardsByDeckStringReturn>;
    searchCards: (args: SearchCardsArgs, headers?: object | undefined) => Promise<SearchCardsReturn>;
    getCardOwnership: (args: GetCardOwnershipArgs, headers?: object | undefined) => Promise<GetCardOwnershipReturn>;
    getPendingCards: (headers?: object | undefined) => Promise<GetPendingCardsReturn>;
    listDecks: (args: ListDecksArgs, headers?: object | undefined) => Promise<ListDecksReturn>;
    searchDecks: (args: SearchDecksArgs, headers?: object | undefined) => Promise<SearchDecksReturn>;
    createDeck: (args: CreateDeckArgs, headers?: object | undefined) => Promise<CreateDeckReturn>;
    updateDeck: (args: UpdateDeckArgs, headers?: object | undefined) => Promise<UpdateDeckReturn>;
    favoriteDeck: (args: FavoriteDeckArgs, headers?: object | undefined) => Promise<FavoriteDeckReturn>;
    unfavoriteDeck: (args: UnfavoriteDeckArgs, headers?: object | undefined) => Promise<UnfavoriteDeckReturn>;
    toggleDeckFavorite: (args: ToggleDeckFavoriteArgs, headers?: object | undefined) => Promise<ToggleDeckFavoriteReturn>;
    getDeck: (args: GetDeckArgs, headers?: object | undefined) => Promise<GetDeckReturn>;
    checkDeck: (args: CheckDeckArgs, headers?: object | undefined) => Promise<CheckDeckReturn>;
    deleteDeck: (args: DeleteDeckArgs, headers?: object | undefined) => Promise<DeleteDeckReturn>;
    searchDeckRanks: (args: SearchDeckRanksArgs, headers?: object | undefined) => Promise<SearchDeckRanksReturn>;
    listDeckRanks: (args: ListDeckRanksArgs, headers?: object | undefined) => Promise<ListDeckRanksReturn>;
    markDeckNotNew: (args: MarkDeckNotNewArgs, headers?: object | undefined) => Promise<MarkDeckNotNewReturn>;
    listLeaderboard: (args: ListLeaderboardArgs, headers?: object | undefined) => Promise<ListLeaderboardReturn>;
    listMatches: (args: ListMatchesArgs, headers?: object | undefined) => Promise<ListMatchesReturn>;
    getMatch: (args: GetMatchArgs, headers?: object | undefined) => Promise<GetMatchReturn>;
    getCurrentSeason: (headers?: object | undefined) => Promise<GetCurrentSeasonReturn>;
    getNextRewardsTime: (headers?: object | undefined) => Promise<GetNextRewardsTimeReturn>;
    getNextSeasonTime: (headers?: object | undefined) => Promise<GetNextSeasonTimeReturn>;
    getCurrentSeasonStartTime: (headers?: object | undefined) => Promise<GetCurrentSeasonStartTimeReturn>;
    accountLeaderboard: (args: AccountLeaderboardArgs, headers?: object | undefined) => Promise<AccountLeaderboardReturn>;
    getMatchArchiveRecordsURI: (args: GetMatchArchiveRecordsURIArgs, headers?: object | undefined) => Promise<GetMatchArchiveRecordsURIReturn>;
    getMatchLiveRecordsURI: (args: GetMatchLiveRecordsURIArgs, headers?: object | undefined) => Promise<GetMatchLiveRecordsURIReturn>;
    botMatchEnd: (args: BotMatchEndArgs, headers?: object | undefined) => Promise<BotMatchEndReturn>;
    internalMatchStart: (args: InternalMatchStartArgs, headers?: object | undefined) => Promise<InternalMatchStartReturn>;
    internalMatchEnd: (args: InternalMatchEndArgs, headers?: object | undefined) => Promise<InternalMatchEndReturn>;
    internalAppendMatchArchiveRecords: (args: InternalAppendMatchArchiveRecordsArgs, headers?: object | undefined) => Promise<InternalAppendMatchArchiveRecordsReturn>;
    internalAppendMatchLiveRecords: (args: InternalAppendMatchLiveRecordsArgs, headers?: object | undefined) => Promise<InternalAppendMatchLiveRecordsReturn>;
    internalConquestStatus: (args: InternalConquestStatusArgs, headers?: object | undefined) => Promise<InternalConquestStatusReturn>;
    internalGetAccount: (args: InternalGetAccountArgs, headers?: object | undefined) => Promise<InternalGetAccountReturn>;
    internalGetPrivateSpectateCode: (args: InternalGetPrivateSpectateCodeArgs, headers?: object | undefined) => Promise<InternalGetPrivateSpectateCodeReturn>;
    enterConquest: (args: EnterConquestArgs, headers?: object | undefined) => Promise<EnterConquestReturn>;
    conquestStatus: (headers?: object | undefined) => Promise<ConquestStatusReturn>;
    conquestStats: (headers?: object | undefined) => Promise<ConquestStatsReturn>;
    conquestRewards: (headers?: object | undefined) => Promise<ConquestRewardsReturn>;
    conquestPoints: (headers?: object | undefined) => Promise<ConquestPointsReturn>;
    conquestV2Pool: (headers?: object | undefined) => Promise<ConquestV2PoolReturn>;
    conquestV2Progress: (headers?: object | undefined) => Promise<ConquestV2ProgressReturn>;
    listSkypassRewards: (args: ListSkypassRewardsArgs, headers?: object | undefined) => Promise<ListSkypassRewardsReturn>;
    claimSkypassRewards: (args: ClaimSkypassRewardsArgs, headers?: object | undefined) => Promise<ClaimSkypassRewardsReturn>;
    iAPVerifyGoogleProducts: (args: IAPVerifyGoogleProductsArgs, headers?: object | undefined) => Promise<IAPVerifyGoogleProductsReturn>;
    iAPVerifyAppleProducts: (args: IAPVerifyAppleProductsArgs, headers?: object | undefined) => Promise<IAPVerifyAppleProductsReturn>;
    iAPVerifyGoogleProducts2: (args: IAPVerifyGoogleProducts2Args, headers?: object | undefined) => Promise<IAPVerifyGoogleProducts2Return>;
    iAPVerifyAppleProducts2: (args: IAPVerifyAppleProducts2Args, headers?: object | undefined) => Promise<IAPVerifyAppleProducts2Return>;
    joinEarlyAccessList: (args: JoinEarlyAccessListArgs, headers?: object | undefined) => Promise<JoinEarlyAccessListReturn>;
    recordGameClientFeedback: (args: RecordGameClientFeedbackArgs, headers?: object | undefined) => Promise<RecordGameClientFeedbackReturn>;
    heroUnlockLevels: (headers?: object | undefined) => Promise<HeroUnlockLevelsReturn>;
    deckClassUnlockLevels: (headers?: object | undefined) => Promise<DeckClassUnlockLevelsReturn>;
    availableXPBonuses: (headers?: object | undefined) => Promise<AvailableXPBonusesReturn>;
    reportAccount: (args: ReportAccountArgs, headers?: object | undefined) => Promise<ReportAccountReturn>;
    saveCookiePolicy: (args: SaveCookiePolicyArgs, headers?: object | undefined) => Promise<SaveCookiePolicyReturn>;
    getCookiePolicy: (headers?: object | undefined) => Promise<GetCookiePolicyReturn>;
    getDiscordInfo: (headers?: object | undefined) => Promise<GetDiscordInfoReturn>;
    getTwitchInfo: (headers?: object | undefined) => Promise<GetTwitchInfoReturn>;
    getFeaturedStreamers: (headers?: object | undefined) => Promise<GetFeaturedStreamersReturn>;
    gMAddFeaturedStreamer: (args: GMAddFeaturedStreamerArgs, headers?: object | undefined) => Promise<GMAddFeaturedStreamerReturn>;
    gMRemoveFeaturedStreamer: (args: GMRemoveFeaturedStreamerArgs, headers?: object | undefined) => Promise<GMRemoveFeaturedStreamerReturn>;
    getBanners: (headers?: object | undefined) => Promise<GetBannersReturn>;
    gMListBanners: (headers?: object | undefined) => Promise<GMListBannersReturn>;
    gMAddBanner: (args: GMAddBannerArgs, headers?: object | undefined) => Promise<GMAddBannerReturn>;
    gMModifyBanner: (args: GMModifyBannerArgs, headers?: object | undefined) => Promise<GMModifyBannerReturn>;
    gMRemoveBanner: (args: GMRemoveBannerArgs, headers?: object | undefined) => Promise<GMRemoveBannerReturn>;
    getGameModesStatus: (headers?: object | undefined) => Promise<GetGameModesStatusReturn>;
    adminListAccounts: (args: AdminListAccountsArgs, headers?: object | undefined) => Promise<AdminListAccountsReturn>;
    adminSearchAccounts: (args: AdminSearchAccountsArgs, headers?: object | undefined) => Promise<AdminSearchAccountsReturn>;
    gMFindAccount: (args: GMFindAccountArgs, headers?: object | undefined) => Promise<GMFindAccountReturn>;
    gMRenameAccount: (args: GMRenameAccountArgs, headers?: object | undefined) => Promise<GMRenameAccountReturn>;
    gMUnlockAllBaseCards: (args: GMUnlockAllBaseCardsArgs, headers?: object | undefined) => Promise<GMUnlockAllBaseCardsReturn>;
    gMGiveLevels: (args: GMGiveLevelsArgs, headers?: object | undefined) => Promise<GMGiveLevelsReturn>;
    gMSetRP: (args: GMSetRPArgs, headers?: object | undefined) => Promise<GMSetRPReturn>;
    gMSetWarmupGamesCompleted: (args: GMSetWarmupGamesCompletedArgs, headers?: object | undefined) => Promise<GMSetWarmupGamesCompletedReturn>;
    gMListAccountActions: (args: GMListAccountActionsArgs, headers?: object | undefined) => Promise<GMListAccountActionsReturn>;
    gMCreateAccountAction: (args: GMCreateAccountActionArgs, headers?: object | undefined) => Promise<GMCreateAccountActionReturn>;
    gMIsAccountBanned: (args: GMIsAccountBannedArgs, headers?: object | undefined) => Promise<GMIsAccountBannedReturn>;
    gMListAccountSignals: (args: GMListAccountSignalsArgs, headers?: object | undefined) => Promise<GMListAccountSignalsReturn>;
    gMAccountSignalSummaries: (args: GMAccountSignalSummariesArgs, headers?: object | undefined) => Promise<GMAccountSignalSummariesReturn>;
    gMListAccounts: (args: GMListAccountsArgs, headers?: object | undefined) => Promise<GMListAccountsReturn>;
    gMListMatches: (args: GMListMatchesArgs, headers?: object | undefined) => Promise<GMListMatchesReturn>;
    gMSetReviewed: (args: GMSetReviewedArgs, headers?: object | undefined) => Promise<GMSetReviewedReturn>;
    gMListPendingCards: (args: GMListPendingCardsArgs, headers?: object | undefined) => Promise<GMListPendingCardsReturn>;
    gMStats: (headers?: object | undefined) => Promise<GMStatsReturn>;
    gMGameModeSet: (args: GMGameModeSetArgs, headers?: object | undefined) => Promise<GMGameModeSetReturn>;
    gMGameModeStatusHistory: (args: GMGameModeStatusHistoryArgs, headers?: object | undefined) => Promise<GMGameModeStatusHistoryReturn>;
    gMSetConquestV2PoolConfig: (args: GMSetConquestV2PoolConfigArgs, headers?: object | undefined) => Promise<GMSetConquestV2PoolConfigReturn>;
    gMGetConquestV2PoolConfig: (headers?: object | undefined) => Promise<GMGetConquestV2PoolConfigReturn>;
    gMGetConquestV2Summary: (headers?: object | undefined) => Promise<GMGetConquestV2SummaryReturn>;
    gMListConquestV2AccountTreasureProgress: (args: GMListConquestV2AccountTreasureProgressArgs, headers?: object | undefined) => Promise<GMListConquestV2AccountTreasureProgressReturn>;
    gMAppDevKeyCreate: (args: GMAppDevKeyCreateArgs, headers?: object | undefined) => Promise<GMAppDevKeyCreateReturn>;
    gMAppDevKeyFind: (args: GMAppDevKeyFindArgs, headers?: object | undefined) => Promise<GMAppDevKeyFindReturn>;
    ping: (headers?: object | undefined) => Promise<PingReturn>;
    version: (headers?: object | undefined) => Promise<VersionReturn>;
}
export interface WebRPCError extends Error {
    code: string;
    msg: string;
    status: number;
}
export declare type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
