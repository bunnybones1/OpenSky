import { CookiePolicyOption } from '@opensky/proto'

import { AccountStat, GameMode, PlayerRank, PlayerRankStage } from '~/lib/proto'

export const DefaultAccountStats = (
  address: string,
  mode: GameMode,
  season?: number
): AccountStat => {
  return {
    gameMode: mode,
    winCount: 0,
    lossCount: 0,
    tieCount: 0,
    forfeitCount: 0,
    abandonCount: 0,
    winRatio: 0,
    gamesPlayed: 0,
    score: 0,
    createdAt: new Date(0).toISOString(),
    playerRank: PlayerRank.UNRANKED,
    playerRankStage: PlayerRankStage.STAGE_II,
    playerRankState: '',
    winStreak: 0,
    lossStreak: 0,
    rankProgress: 0,
    season: season
  }
}

export const RANKS: PlayerRank[] = [
  PlayerRank.UNRANKED,
  PlayerRank.WANDERER,
  PlayerRank.TRAINEE,
  PlayerRank.APPRENTICE,
  PlayerRank.EXPERT,
  PlayerRank.MASTER,
  PlayerRank.GRANDWEAVER
]

export const COOKIES = [
  {
    id: CookiePolicyOption.AUTHENTICATION,
    type: 'Functional',
    vendor: 'skyweaver.net',
    reason: 'support.cookies.authTitle',
    essential: true,
    cookieValues: ['_pmxz', '_pmxr', '_pmcc', '_pmxb'],
    description: 'support.cookies.authDesc'
  },
  {
    id: CookiePolicyOption.GEO_BLOCKING,
    type: 'Functional',
    vendor: 'skyweaver.net',
    reason: 'support.cookies.geoBlockingTitle',
    essential: true,
    cookieValues: ['_pmip', '_pmipnum'],
    description: 'support.cookies.geoBlockingDesc'
  },
  {
    id: CookiePolicyOption.MARKETPLACE,
    type: 'Functional',
    vendor: 'skyweaver.net',
    reason: 'support.cookies.marketplaceTitle',
    essential: true,
    cookieValues: ['_pmxz', '_pmxr', '_pmcc', '_pmxb'],
    description: 'support.cookies.marketplaceDesc'
  },
  {
    id: CookiePolicyOption.PRODUCT_ANALYTICS,
    type: 'Analytics',
    vendor: 'segment.com',
    reason: 'support.cookies.productAnalyticsTitle',
    essential: false,
    cookieValues: ['ajs_user_id', 'ajs_anonymous_id', 'ajs_group_id'],
    description: 'support.cookies.productAnalyticsDesc'
  }
]

export const GDPR_COUNTRIES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'GB'
]
