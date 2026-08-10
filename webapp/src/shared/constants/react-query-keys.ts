import { DeckClass, ItemType } from '@opensky/proto'
import { UserStorageKeys } from '@opensky/shared/constants'

import { GameMode, PaymentProvider } from '~/lib/proto'

import { UsePlayerLeaderboardArgs } from '../types/leaderboard'
import { MarketMode } from '../types/market'

const lowerCaseParam = (param: string) => ({
  address: param.toLowerCase()
})

export const NEWS = ['NEWS']
export const INVITE_STICKERS = ['INVITE_STICKERS']
const INVITE_POINTS = 'INVITE_POINTS'
const ACCOUNT = 'ACCOUNT'
const GIFTED_POINTS = 'GIFTED_POINTS'
const SEEN_POINTS = 'SEEN_POINTS'
const SPECTATE_CODE = 'SPECTATE_CODE'
export const TWITCH_COUNTS = ['TWITCH_COUNTS']
export const LIVE_TWITCH_STREAMS = ['LIVE_TWITCH_STREAMS']
export const FEATURED_STREAMERS = ['FEATURED_STREAMERS']
export const CACHE_INFO = ['CACHE_INFO']
const ASSET_MANIFEST = 'ASSET_MANIFEST'
const GAME_ASSET_CACHE = 'GAME_ASSET_CACHE'
const GAME_ASSET_CACHE_ERROR = 'GAME_ASSET_CACHE_ERROR'
export const AUTH_INFO = ['AUTH_INFO']
export const HERO_UNLOCK_LEVELS = ['HERO_UNLOCK_LEVELS']
const ACCOUNT_STATS = 'ACCOUNT_STATS'
const HERO_SKIN_BALANCES = 'HERO_SKIN_BALANCES'
export const NEXT_REWARDS_TIME = ['NEXT_REWARDS_TIME']
export const SEASON_INFO = ['SEASON_INFO']
const CONQUEST_AND_USDC_BALANCES = 'CONQUEST_AND_USDC_BALANCES'
const COOKIE_POLICY = 'COOKIE_POLICY'
export const BANNERS = ['BANNERS']
const USER_STORAGE = 'USER_STORAGE'
const CONQUEST_POINTS = 'CONQUEST_POINTS'
const CONQUEST_REWARDS = 'CONQUEST_REWARDS'
const CONQUEST_PROGRESS = 'CONQUEST_PROGRESS'
const NOTIFICATIONS = 'NOTIFICATIONS'
const CONQUEST_STATS = 'CONQUEST_STATS'
const CONQUEST_POOL = 'CONQUEST_POOL'
const PENDING_CARDS = 'PENDING_CARDS'
const SEEN_ARTICLES = 'SEEN_ARTICLES'
const HERO_SKIN_MINT_PRICE = 'HERO_SKIN_MINT_PRICE'
const CONQUEST_TICKET_USDC_PRICE = 'CONQUEST_TICKET_USDC_PRICE'
export const CONQUEST_TREASURE_INFO = ['CONQUEST_TREASURE_INFO']
export const SKYPASS_INFO = ['SKYPASS_INFO']
export const SKYPASS_STRIPE_PRODUCTS = ['SKYPASS_STRIPE_PRODUCTS']
export const SKYPASS_USDC_PRICE = ['SKYPASS_USDC_PRICE']
export const ON_CHAIN_TRANSACTION = ['ON_CHAIN_TRANSACTION']
export const PAYMENT_PROVIDER_PRODUCTS = ['PAYMENT_PROVIDER_PRODUCTS']
const USER_DECKS = 'USER_DECKS'
const MARKET_DECKS = 'MARKET_DECKS'
const DECK_TOP_PLAYER = 'DECK_TOP_PLAYER'
const CART = 'CART'
const FEED = 'FEED'
const WALLET_VALUE = 'WALLET_VALUE'
const EQUIPPED_ITEMS = 'EQUIPPED_ITEMS'
const SKYTAG_TITLE_BALANCES = 'SKYTAG_TITLE_BALANCES'
const CARD_BALANCES = 'CARD_BALANCES'
const DECK_CLASS_UNLOCK_STATUS = 'DECK_CLASS_UNLOCK_STATUS'
const CARD_BALANCE_OVERVIEW = 'CARD_BALANCE_OVERVIEW'
const TOKEN_PRICE = 'TOKEN_PRICE'
const SORTED_TOKEN_PRICE = 'SORTED_TOKEN_PRICE'
const TOKEN_BALANCES = 'TOKEN_BALANCES'
const QUESTS_LISTS = 'QUESTS_LISTS'
export const QUESTS_TIMER = ['QUESTS_TIMER']
const DECK_LEADERBOARD = 'DECK_LEADERBOARD'
const PLAYER_LEADERBOARD = 'PLAYER_LEADERBOARD'
const ACCOUNT_LEADERBOARD = 'ACCOUNT_LEADERBOARD'
const MATCH_HISTORY = 'MATCH_HISTORY'
const IN_PROGRESS_MATCH = 'IN_PROGRESS_MATCH'
const STORED_MATCH_INFO = 'STORED_MATCH_INFO'
const CONQUEST_STATUS = 'CONQUEST_STATUS'

export const getGameAssetCache = (type?: string) =>
  !!type ? [GAME_ASSET_CACHE, lowerCaseParam(type)] : [GAME_ASSET_CACHE]

export const getGameAssetCacheError = (type?: string) =>
  !!type ? [GAME_ASSET_CACHE_ERROR, lowerCaseParam(type)] : [GAME_ASSET_CACHE_ERROR]

export const getSeenNewsArticlesKey = (address?: string) =>
  !!address ? [SEEN_ARTICLES, lowerCaseParam(address)] : [SEEN_ARTICLES]

export const getInvitePointsKey = (address?: string) =>
  !!address ? [INVITE_POINTS, lowerCaseParam(address)] : [INVITE_POINTS]

export const getUseAccountKey = (address?: string) =>
  !address ? [ACCOUNT] : [ACCOUNT, lowerCaseParam(address)]

export const getGiftedPointsKey = (address?: string) =>
  !!address ? [GIFTED_POINTS, lowerCaseParam(address)] : [GIFTED_POINTS]

export const getSeenPointsKey = (address: string) => [
  SEEN_POINTS,
  lowerCaseParam(address)
]

export const getSpectateCodeKey = (address?: string) =>
  !address ? [SPECTATE_CODE] : [SPECTATE_CODE, lowerCaseParam(address)]

export const getAssetManifestKey = (type: 'webapp' | 'game') => [
  ASSET_MANIFEST,
  { type }
]

export const getAccountStatsKey = (address?: string) =>
  !!address ? [ACCOUNT_STATS, lowerCaseParam(address)] : [ACCOUNT_STATS]

export const getHeroSkinBalancesKey = (address?: string) =>
  !!address ? [HERO_SKIN_BALANCES, lowerCaseParam(address)] : [HERO_SKIN_BALANCES]

export const getConquestAndUSDCBalancesKey = (address?: string) =>
  !!address
    ? [CONQUEST_AND_USDC_BALANCES, lowerCaseParam(address)]
    : [CONQUEST_AND_USDC_BALANCES]

export const getCookiePolicyKey = (address?: string) =>
  !!address ? [COOKIE_POLICY, lowerCaseParam(address)] : [COOKIE_POLICY]

export const getBannersKey = (address?: string) =>
  !!address ? [BANNERS, lowerCaseParam(address)] : [BANNERS]

export const getUserStorageKey = (key: UserStorageKeys, address?: string) =>
  !address ? [USER_STORAGE] : [USER_STORAGE, { key, address: address.toLowerCase() }]

export const getConquestPointsKey = (address?: string) =>
  !!address ? [CONQUEST_POINTS, lowerCaseParam(address)] : [CONQUEST_POINTS]

export const getConquestRewardsKey = (address?: string) =>
  !!address ? [CONQUEST_REWARDS, lowerCaseParam(address)] : [CONQUEST_REWARDS]

export const getConquestProgressKey = (address?: string) =>
  !!address ? [CONQUEST_PROGRESS, lowerCaseParam(address)] : [CONQUEST_PROGRESS]

export const getConquestStatsKey = (address?: string) =>
  !!address ? [CONQUEST_STATS, lowerCaseParam(address)] : [CONQUEST_STATS]

export const getNotificationsKey = (address?: string) =>
  !!address ? [NOTIFICATIONS, lowerCaseParam(address)] : [NOTIFICATIONS]

export const getConquestPoolKey = (address?: string) =>
  !!address ? [CONQUEST_POOL, lowerCaseParam(address)] : [CONQUEST_POOL]

export const getPendingCardsKey = (address?: string) =>
  !!address ? [PENDING_CARDS, lowerCaseParam(address)] : [PENDING_CARDS]

export const getHeroSkinMintPriceKey = (id: number | undefined, quantity: number) =>
  !!id ? [HERO_SKIN_MINT_PRICE, { id, quantity }] : [HERO_SKIN_MINT_PRICE]

export const getPaymentProviderProductsKey = (
  provider: PaymentProvider,
  itemType: ItemType
) => [PAYMENT_PROVIDER_PRODUCTS, { provider, itemType }]

export const getConquestTicketUSDCPriceKey = (quantity: number) => [
  CONQUEST_TICKET_USDC_PRICE,
  { quantity }
]

export const getUserDecksKey = (address?: string) =>
  !!address ? [USER_DECKS, lowerCaseParam(address)] : [USER_DECKS]

export const getMarketDecksKey = (
  sort: 'score' | 'games_played',
  deckClass?: DeckClass
) => [MARKET_DECKS, { sort, deckClass }]

export const getDeckTopPlayerKey = (deckString: string) => [
  DECK_TOP_PLAYER,
  { deckString: deckString.toLowerCase() }
]

export const getCartKey = (address?: string) =>
  !!address ? [CART, { address }] : [CART]

export const getFeedKey = (address?: string) => {
  if (!address) return [FEED]
  return [FEED, lowerCaseParam(address)]
}

export const getWalletValueKey = (address?: string) => {
  if (!address) return [WALLET_VALUE]
  return [WALLET_VALUE, lowerCaseParam(address)]
}

export const getEquippedItemsKey = (itemType: ItemType, address?: string) =>
  !address
    ? [EQUIPPED_ITEMS, { itemType }]
    : [EQUIPPED_ITEMS, { itemType, ...lowerCaseParam(address) }]

export const getSkyTagTitleBalancesKey = (address?: string) =>
  !address
    ? [SKYTAG_TITLE_BALANCES]
    : [SKYTAG_TITLE_BALANCES, lowerCaseParam(address)]

export const getCardBalancesKey = (address?: string) =>
  !address ? [CARD_BALANCES] : [CARD_BALANCES, lowerCaseParam(address)]

export const getCardBalanceOverviewKey = (address?: string) =>
  !address
    ? [CARD_BALANCE_OVERVIEW]
    : [CARD_BALANCE_OVERVIEW, lowerCaseParam(address)]

export const getDeckClassUnlockStatusKey = (address?: string) =>
  !address
    ? [DECK_CLASS_UNLOCK_STATUS]
    : [DECK_CLASS_UNLOCK_STATUS, lowerCaseParam(address)]

export interface UseTokenPriceAndSupplyArgs {
  id: number
  quantity: number
  mode: MarketMode
  isDisabled?: boolean
}

export const getTokenPriceAndSupplyKey = ({
  mode,
  quantity,
  id,
  isDisabled
}: UseTokenPriceAndSupplyArgs) =>
  !!isDisabled ? [TOKEN_PRICE, { isDisabled }] : [TOKEN_PRICE, { mode, quantity, id }]

export const getTokensSortedByPriceKey = (mode: MarketMode, itemType: ItemType) => [
  SORTED_TOKEN_PRICE,
  { mode, itemType }
]

export const getTokenBalancesKey = (
  itemType: ItemType | undefined,
  address?: string
) =>
  !address
    ? [TOKEN_BALANCES, { itemType }]
    : [TOKEN_BALANCES, { itemType, address: address.toLowerCase() }]

export const getQuestsListsKey = (address?: string) =>
  !!address ? [QUESTS_LISTS, lowerCaseParam(address)] : [QUESTS_LISTS]

export const getDeckLeaderboardKey = (deckClass?: DeckClass) => [
  DECK_LEADERBOARD,
  { deckClass: !!deckClass ? deckClass : 'ALL' }
]

export const getPlayerLeaderboardKey = ({
  gameMode,
  playerRank,
  season,
  playerNamePrefix,
  region
}: UsePlayerLeaderboardArgs) => {
  const args: UsePlayerLeaderboardArgs = {
    gameMode,
    playerRank
  }

  if (!!season) args.season = season
  if (!!playerNamePrefix) args.playerNamePrefix = playerNamePrefix
  if (!!region) args.region = region

  return [PLAYER_LEADERBOARD, args]
}

export const getAccountLeaderBoardKey = (gameMode: GameMode, season?: number) => {
  if (!season) return [ACCOUNT_LEADERBOARD, { gameMode }]
  return [ACCOUNT_LEADERBOARD, { gameMode, season }]
}

export const getMatchHistoryKey = (address?: string) =>
  !!address ? [MATCH_HISTORY, lowerCaseParam(address)] : [MATCH_HISTORY]

export const getInProgressMatchKey = (address?: string) =>
  !!address ? [IN_PROGRESS_MATCH, lowerCaseParam(address)] : [IN_PROGRESS_MATCH]

export const getStoredMatchInfoKey = (address?: string) =>
  !!address ? [STORED_MATCH_INFO, lowerCaseParam(address)] : [STORED_MATCH_INFO]

export const getConquestStatusKey = (address?: string) =>
  !!address ? [CONQUEST_STATUS, lowerCaseParam(address)] : [CONQUEST_STATUS]
