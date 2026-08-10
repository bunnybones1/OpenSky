import { DeckClass, Hero, PlayerRank } from '@opensky/proto'
import { BaseCard, Prism } from '@skyweaver/state-metadata'

export const CACHE_PREFIX = '@opensky/'
export const CACHE_VERSION = 'v1'
export const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`

export const SKYWEAVER_JWT_KEY = '_opensky.api.jwt'
export const BURNER_WALLET_PK_KEY = '_opensky.wallet.pk'
export const SEQUENCE_JWT_KEY = '_sequence.api.jwt'

export const MATCHMAKER_MATCH_INFO_ENDPOINT = 'matchinfo'

export const GAME_SERVICE_AUTH_KEY = 'swtoken'

// Store mobile & desktop version as just the barebones string major.minor.patch e.g. OpenSky-Mobile/v1.0.0.x becomes '1.0.0'
export const minimumOpenSkyMobileVersion = '2.7.3'
export const minimumOpenSkyDesktopVersion = '0.9.0'
export const openskyDesktopUserAgentPrefix = 'OpenSky-Desktop/v'
export const openskyMobileUserAgentPrefix = 'OpenSky-Mobile/v'
export const versionCharLength = 5

// NOTE: If you change this constant, you must change the identical constant in /api/data/account_stats_store.go as well.
export const NUM_GRANDWEAVERS = 100

// Token info
export const CONQUEST_TICKET_ID = 2 ** 16 * 254 + 1
export const USDC_DECIMAL = 6
export const USDC_BASE_UNIT = 10 ** USDC_DECIMAL
export const SKYWEAVER_ASSETS_DECIMAL = 2
export const SKYWEAVER_ASSETS_BASE_UNIT = 10 ** SKYWEAVER_ASSETS_DECIMAL

export const WINS_TO_RANK_UP: { [key in PlayerRank]: number } = {
  [PlayerRank.UNKNOWN]: 0,
  [PlayerRank.UNRANKED]: 20,
  [PlayerRank.WANDERER]: 20,
  [PlayerRank.TRAINEE]: 20,
  [PlayerRank.APPRENTICE]: 24,
  [PlayerRank.EXPERT]: 28,
  [PlayerRank.MASTER]: 0,
  [PlayerRank.GRANDWEAVER]: 0
}

export const RANK_XP_BONUS = {
  [PlayerRank.UNRANKED]: 0,
  [PlayerRank.WANDERER]: 200,
  [PlayerRank.TRAINEE]: 400,
  [PlayerRank.APPRENTICE]: 600,
  [PlayerRank.EXPERT]: 800,
  [PlayerRank.MASTER]: 1000,
  [PlayerRank.GRANDWEAVER]: 0
}

export enum PrismClass {
  STR = 'STR',
  HRT = 'HRT',
  AGY = 'AGY',
  INT = 'INT',
  WIS = 'WIS'
}

export enum UserStorageKeys {
  GAME_INFO = 'game_info',
  TUTORIAL_PROGRESS = 'tutorial_progress',
  /**
   * @deprecated The cart uses the SHOPPING_CART key now
   */
  SAVED_SHOPPING_CART = 'saved_shopping_cart',
  MODALS_TO_SKIP = 'modals_to_skip',
  TERMS_OF_SERVICES = 'terms_of_service',
  INITIAL_TUTORIAL_SKIP = 'initial_tutorial_skip',
  WEBAPP_COOKIES = 'webapp_cookies',
  CATEGORY_THREE_STATE = 'category_three_state',
  CURRENT_US_STATE = 'current_us_state',
  NEWS_ARTICLES_SEEN = 'news_articles_seen',
  WALKTHROUGH_TUTORIAL_COMPLETED = 'walkthrough_tutorial_completed',
  WALKTHROUGH_PRACTICE_BOT_COMPLETED = 'walkthrough_practice_completed',
  NEW_FEATURES_SEEN = 'new_features_seen',
  HIDE_USDC_VALUE = 'hide_usdc_value',
  SEEN_INVITE_POINTS = 'seen_invite_points',
  SHOPPING_CART = 'new_cart_hello',
  SOUND_SETTINGS = 'sound_settings'
}

export enum ModalStorageKeys {
  DISCLAIMER = 'disclaimer',
  DAILY_BONUS_XP = 'daily_bonus_xp',
  CONVERT_SILVER = 'convert_silver',
  CONQUEST_HERO_LOCK = 'conquest_hero_lock',
  ADD_FUNDS_POLYGON = 'add_funds_polygon',
  FIRST_ACCESS_SKYPASS = 'first_access_skypass'
}

export const MONO_PRISM_CODES = [
  DeckClass.STR,
  DeckClass.AGY,
  DeckClass.WIS,
  DeckClass.HRT,
  DeckClass.INT
]

type PickKey<T, K extends keyof T> = Extract<keyof T, K>

export type MonoDeckClass = PickKey<typeof DeckClass, keyof typeof PrismClass>

export const POLY_PRISM_CODES = [
  DeckClass.AGI,
  DeckClass.AGW,
  DeckClass.HRA,
  DeckClass.HRI,
  DeckClass.HRW,
  DeckClass.INW,
  DeckClass.STA,
  DeckClass.STH,
  DeckClass.STI,
  DeckClass.STW
]

export const COMBINED_CODES = [...MONO_PRISM_CODES, ...POLY_PRISM_CODES]

export const COMBINED_CODES_ORDERED = [
  DeckClass.STR,
  DeckClass.AGY,
  DeckClass.WIS,
  DeckClass.HRT,
  DeckClass.INT,
  DeckClass.STA,
  DeckClass.STW,
  DeckClass.AGW,
  DeckClass.STH,
  DeckClass.HRA,
  DeckClass.HRW,
  DeckClass.STI,
  DeckClass.AGI,
  DeckClass.INW,
  DeckClass.HRI,
  DeckClass.UNKNOWN_CLASS
]

export const CODE_PRISMS: { [K in DeckClass]: PrismClass[] } = {
  [DeckClass.UNKNOWN_CLASS]: [],
  [DeckClass.HRT]: [PrismClass.HRT],
  [DeckClass.STR]: [PrismClass.STR],
  [DeckClass.INT]: [PrismClass.INT],
  [DeckClass.AGY]: [PrismClass.AGY],
  [DeckClass.WIS]: [PrismClass.WIS],
  [DeckClass.AGI]: [PrismClass.AGY, PrismClass.INT],
  [DeckClass.AGW]: [PrismClass.AGY, PrismClass.WIS],
  [DeckClass.HRA]: [PrismClass.HRT, PrismClass.AGY],
  [DeckClass.HRI]: [PrismClass.HRT, PrismClass.INT],
  [DeckClass.HRW]: [PrismClass.HRT, PrismClass.WIS],
  [DeckClass.INW]: [PrismClass.INT, PrismClass.WIS],
  [DeckClass.STA]: [PrismClass.STR, PrismClass.AGY],
  [DeckClass.STH]: [PrismClass.STR, PrismClass.HRT],
  [DeckClass.STI]: [PrismClass.STR, PrismClass.INT],
  [DeckClass.STW]: [PrismClass.STR, PrismClass.WIS]
}

export const PLAYABLE_DECK_PRISMS = [
  PrismClass.HRT,
  PrismClass.STR,
  PrismClass.WIS,
  PrismClass.AGY,
  PrismClass.INT
]

export const BASE_CODE_LABELS = {
  [PrismClass.AGY]: 'agility',
  [PrismClass.HRT]: 'heart',
  [PrismClass.INT]: 'intellect',
  [PrismClass.STR]: 'strength',
  [PrismClass.WIS]: 'wisdom'
}

export const DECK_FILTERS = {
  ...CODE_PRISMS,
  DEFAULT: [PrismClass.HRT, PrismClass.STR, PrismClass.WIS, PrismClass.AGY],
  UNKNOWN_CLASS: [
    PrismClass.HRT,
    PrismClass.STR,
    PrismClass.WIS,
    PrismClass.AGY
  ]
}

export const DECKS_CONFIG = COMBINED_CODES.map(code => {
  const filters = DECK_FILTERS[code]

  const isPoly = POLY_PRISM_CODES.includes(code) && filters.length > 1

  const playable = isPoly
    ? PLAYABLE_DECK_PRISMS.includes(filters[0]) &&
      PLAYABLE_DECK_PRISMS.includes(filters[1])
    : PLAYABLE_DECK_PRISMS.includes(filters[0])

  return {
    code,
    filters: DECK_FILTERS[code] as any, //very strange, need to cast as any to keep types compatible with string[] | DeckClass[] after migration
    label: `${BASE_CODE_LABELS[filters[0]]}${
      isPoly ? `/${BASE_CODE_LABELS[filters[1]]}` : ''
    }`,
    playable
  }
})

export const DECKCLASS_HEROES: { [K in DeckClass]: Hero } = {
  [DeckClass.UNKNOWN_CLASS]: Hero.UNKNOWN,
  [DeckClass.STR]: Hero.ADA,
  [DeckClass.AGY]: Hero.SAMYA,
  [DeckClass.STA]: Hero.FOX,
  [DeckClass.WIS]: Hero.LOTUS,
  [DeckClass.STW]: Hero.TITUS,
  [DeckClass.AGW]: Hero.IRIS,
  [DeckClass.HRT]: Hero.BOURAN,
  [DeckClass.STH]: Hero.HORIK,
  [DeckClass.HRA]: Hero.ZOEY,
  [DeckClass.HRW]: Hero.AXEL,
  [DeckClass.INT]: Hero.ARI,
  [DeckClass.STI]: Hero.MIRA,
  [DeckClass.AGI]: Hero.MAI,
  [DeckClass.INW]: Hero.BANJO,
  [DeckClass.HRI]: Hero.SITTI
}

// When you update this, make sure to update
// /matchmaker/lib/player/private_seed.go as well.
export const DECKCLASS_ABILITIES: { [K in DeckClass]: BaseCard | undefined } = {
  [DeckClass.UNKNOWN_CLASS]: undefined,
  [DeckClass.STR]: '25000',
  [DeckClass.HRT]: '25002',
  [DeckClass.AGY]: '25001',
  [DeckClass.INT]: '25003',
  [DeckClass.WIS]: '25004',
  [DeckClass.STH]: '25013',
  [DeckClass.STA]: '25009',
  [DeckClass.STI]: '25026',
  [DeckClass.STW]: '25007',
  [DeckClass.HRA]: '25011',
  [DeckClass.HRI]: '25012',
  [DeckClass.HRW]: '25023',
  [DeckClass.AGI]: '25010',
  [DeckClass.AGW]: '25008',
  [DeckClass.INW]: '25014'
}
export function getDeckClassByAbilityBaseCard(base: BaseCard) {
  const t = Object.keys(DECKCLASS_ABILITIES) as DeckClass[]
  for (const k of t) {
    if (DECKCLASS_ABILITIES[k] === base) {
      return k
    }
  }
  return DeckClass.UNKNOWN_CLASS
}

export const HERO_DECKCLASS: { [K in Hero]: DeckClass } = {
  [Hero.UNKNOWN]: DeckClass.UNKNOWN_CLASS,
  [Hero.ADA]: DeckClass.STR,
  [Hero.SAMYA]: DeckClass.AGY,
  [Hero.FOX]: DeckClass.STA,
  [Hero.LOTUS]: DeckClass.WIS,
  [Hero.TITUS]: DeckClass.STW,
  [Hero.IRIS]: DeckClass.AGW,
  [Hero.BOURAN]: DeckClass.HRT,
  [Hero.HORIK]: DeckClass.STH,
  [Hero.ZOEY]: DeckClass.HRA,
  [Hero.AXEL]: DeckClass.HRW,
  [Hero.ARI]: DeckClass.INT,
  [Hero.MIRA]: DeckClass.STI,
  [Hero.MAI]: DeckClass.AGI,
  [Hero.BANJO]: DeckClass.INW,
  [Hero.SITTI]: DeckClass.HRI
}

export interface HeroSkin {
  id: number
  name: string
  hero: Hero
  artID: string
  bgID: string
  grade: 'base' | 'silver' | 'gold' | 'none'
  flavorText: string
}

export interface Sticker {
  id: number
  name: string
  artID: string
  flavorText: string
}

export interface Crystal {
  id: number
  name: string
  artID: string
  color: string
  flavorText: string
}

export const BOT_HERO: HeroSkin = {
  artID: 'hero-xavi-05',
  bgID: 'bg-light-02',
  flavorText: '',
  grade: 'base',
  hero: Hero.UNKNOWN,
  id: 0,
  name: 'Bot'
}

export interface CardBack {
  id: number
  name: string
  artID: string
  flavorText: string
  releaseSeason?: number
}

export interface SkyTagTitle {
  id: number
  name: string
  asset: string
  textColor: string
  glowColor: string
}

export const BASE_HERO_SKINS: { [K in Hero]: HeroSkin } = {
  [Hero.UNKNOWN]: {
    artID: 'hero-skin-mysterious',
    bgID: 'bg-hero-skin-mysterious',
    flavorText: '',
    grade: 'base',
    hero: Hero.UNKNOWN,
    id: 0,
    name: 'Unknown Hero'
  },
  [Hero.ADA]: {
    artID: 'hero-giaco-01',
    bgID: 'bg-fire-02',
    flavorText: '',
    grade: 'base',
    hero: Hero.ADA,
    id: -1,
    name: 'Ada'
  },
  [Hero.SAMYA]: {
    artID: 'hero-giaco-02',
    bgID: 'bg-earth-01',
    flavorText: '',
    grade: 'base',
    hero: Hero.SAMYA,
    id: -2,
    name: 'Samya'
  },
  [Hero.FOX]: {
    artID: 'hero-giaco-03',
    bgID: 'bg-fire-01',
    flavorText: '',
    grade: 'base',
    hero: Hero.FOX,
    id: -3,
    name: 'Fox'
  },
  [Hero.LOTUS]: {
    artID: 'hero-brian-01',
    bgID: 'bg-light-03',
    flavorText: '',
    grade: 'base',
    hero: Hero.LOTUS,
    id: -4,
    name: 'Lotus'
  },
  [Hero.TITUS]: {
    artID: 'hero-giaco-12',
    bgID: 'bg-light-02',
    flavorText: '',
    grade: 'base',
    hero: Hero.TITUS,
    id: -5,
    name: 'Titus'
  },
  [Hero.IRIS]: {
    artID: 'hero-giaco-11',
    bgID: 'bg-earth-03',
    flavorText: '',
    grade: 'base',
    hero: Hero.IRIS,
    id: -6,
    name: 'Iris'
  },
  [Hero.BOURAN]: {
    artID: 'hero-brian-02',
    bgID: 'bg-dark-03',
    flavorText: '',
    grade: 'base',
    hero: Hero.BOURAN,
    id: -7,
    name: 'Bouran'
  },
  [Hero.HORIK]: {
    artID: 'hero-giaco-04',
    bgID: 'bg-water-01',
    flavorText: '',
    grade: 'base',
    hero: Hero.HORIK,
    id: -8,
    name: 'Horik'
  },
  [Hero.ZOEY]: {
    artID: 'hero-giaco-06',
    bgID: 'bg-light-01',
    flavorText: '',
    grade: 'base',
    hero: Hero.ZOEY,
    id: -9,
    name: 'Zoey'
  },
  [Hero.AXEL]: {
    artID: 'hero-giaco-07',
    bgID: 'bg-mind-03',
    flavorText: '',
    grade: 'base',
    hero: Hero.AXEL,
    id: -10,
    name: 'Axel'
  },
  [Hero.ARI]: {
    artID: 'hero-xavi-01',
    bgID: 'bg-air-01',
    flavorText: '',
    grade: 'base',
    hero: Hero.ARI,
    id: -11,
    name: 'Ari'
  },
  [Hero.MIRA]: {
    artID: 'hero-giaco-08',
    bgID: 'bg-water-02',
    flavorText: '',
    grade: 'base',
    hero: Hero.MIRA,
    id: -12,
    name: 'Mira'
  },
  [Hero.MAI]: {
    artID: 'hero-giaco-10',
    bgID: 'bg-earth-02',
    flavorText: '',
    grade: 'base',
    hero: Hero.MAI,
    id: -13,
    name: 'Mai'
  },
  [Hero.BANJO]: {
    artID: 'hero-giaco-05',
    bgID: 'bg-mind-01',
    flavorText: '',
    grade: 'base',
    hero: Hero.BANJO,
    id: -14,
    name: 'Banjo'
  },
  [Hero.SITTI]: {
    artID: 'hero-giaco-09',
    bgID: 'bg-water-03',
    flavorText: '',
    grade: 'base',
    hero: Hero.SITTI,
    id: -15,
    name: 'Sitti'
  }
}

export type StarterDeckAssetDetails = {
  backgroundAsset: string
}

export const STARTER_DECK_ASSETS: {
  [K in DeckClass]: StarterDeckAssetDetails
} = {
  STR: {
    backgroundAsset: 'str'
  },
  AGY: {
    backgroundAsset: 'agy'
  },
  WIS: {
    backgroundAsset: 'wis'
  },
  HRT: {
    backgroundAsset: 'hrt'
  },
  INT: {
    backgroundAsset: 'int'
  },
  STH: {
    backgroundAsset: 'str'
  },
  STA: {
    backgroundAsset: 'str'
  },
  STI: {
    backgroundAsset: 'str'
  },
  STW: {
    backgroundAsset: 'str'
  },
  HRA: {
    backgroundAsset: 'str'
  },
  HRI: {
    backgroundAsset: 'str'
  },
  HRW: {
    backgroundAsset: 'str'
  },
  AGI: {
    backgroundAsset: 'str'
  },
  AGW: {
    backgroundAsset: 'str'
  },
  INW: {
    backgroundAsset: 'str'
  },
  UNKNOWN_CLASS: {
    backgroundAsset: 'str'
  }
}
export const DECKCLASS_PRISMS: { [K in DeckClass]: Prism[] } = {
  [DeckClass.UNKNOWN_CLASS]: [],
  [DeckClass.STR]: ['str'],
  [DeckClass.AGY]: ['agy'],
  [DeckClass.STA]: ['str', 'agy'],
  [DeckClass.WIS]: ['wis'],
  [DeckClass.STW]: ['str', 'wis'],
  [DeckClass.AGW]: ['agy', 'wis'],
  [DeckClass.HRT]: ['hrt'],
  [DeckClass.STH]: ['str', 'hrt'],
  [DeckClass.HRA]: ['hrt', 'agy'],
  [DeckClass.HRW]: ['hrt', 'wis'],
  [DeckClass.INT]: ['int'],
  [DeckClass.STI]: ['str', 'int'],
  [DeckClass.AGI]: ['agy', 'int'],
  [DeckClass.INW]: ['int', 'wis'],
  [DeckClass.HRI]: ['hrt', 'int']
}

// custom disconnection codes to distinguish between
// voluntary and involuntary websocket disconnects
// on both client and server side
// e.g. force connection closure on duplicate connections
// https://github.com/Luka967/websocket-close-codes

export const WEBSOCKET_FORCED_CLOSE_CODE = 4004
export const WEBSOCKET_NORMAL_CLOSE_CODE = 1000

export const MOBILE_APP_NAME = 'OpenSky Mobile'
export const WALLET_NAME = 'Sequence'
export const DESKTOP_NAME = 'OpenSky Desktop'

export type Rarity = 'none' | 'base' | 'silver' | 'gold'

/// NOTE: If you change these, change the ones in `api/data/deck.go` too.
export const SINGLE_PRISM_DECK_SIZE = 30
export const DUAL_PRISM_DECK_SIZE = 30

export const HeroIDs = {
  UNKNOWN: 0,
  ADA: 1,
  SAMYA: 2,
  FOX: 3,
  LOTUS: 4,
  TITUS: 5,
  IRIS: 6,
  BOURAN: 7,
  HORIK: 8,
  ZOEY: 9,
  AXEL: 10,
  ARI: 11,
  MIRA: 12,
  MAI: 13,
  BANJO: 14,
  SITTI: 15
} as const

export const ID_HEROES: { [K in HeroID]: Hero } = {
  [HeroIDs.UNKNOWN]: Hero.UNKNOWN,
  [HeroIDs.ADA]: Hero.ADA,
  [HeroIDs.SAMYA]: Hero.SAMYA,
  [HeroIDs.FOX]: Hero.FOX,
  [HeroIDs.LOTUS]: Hero.LOTUS,
  [HeroIDs.TITUS]: Hero.TITUS,
  [HeroIDs.IRIS]: Hero.IRIS,
  [HeroIDs.BOURAN]: Hero.BOURAN,
  [HeroIDs.HORIK]: Hero.HORIK,
  [HeroIDs.ZOEY]: Hero.ZOEY,
  [HeroIDs.AXEL]: Hero.AXEL,
  [HeroIDs.ARI]: Hero.ARI,
  [HeroIDs.MIRA]: Hero.MIRA,
  [HeroIDs.MAI]: Hero.MAI,
  [HeroIDs.BANJO]: Hero.BANJO,
  [HeroIDs.SITTI]: Hero.SITTI
}

const __checkHeroIDs: { [K in Hero]: number } = HeroIDs
void __checkHeroIDs

export type HeroID = (typeof HeroIDs)[keyof typeof HeroIDs]

export const deleteAccountMessage = 'Request account deletion'

export const COUNTRIES = {
  AF: 'Afghanistan',
  AL: 'Albania',
  DZ: 'Algeria',
  AS: 'American Samoa',
  AD: 'Andorra',
  AO: 'Angola',
  AI: 'Anguilla',
  AQ: 'Antarctica',
  AG: 'Antigua and Barbuda',
  AR: 'Argentina',
  AM: 'Armenia',
  AW: 'Aruba',
  AU: 'Australia',
  AT: 'Austria',
  AZ: 'Azerbaijan',
  BS: 'Bahamas',
  BH: 'Bahrain',
  BD: 'Bangladesh',
  BB: 'Barbados',
  BY: 'Belarus',
  BE: 'Belgium',
  BZ: 'Belize',
  BJ: 'Benin',
  BM: 'Bermuda',
  BT: 'Bhutan',
  BO: 'Bolivia',
  BW: 'Botswana',
  BV: 'Bouvet Island',
  BR: 'Brazil',
  BG: 'Bulgaria',
  BF: 'Burkina Faso',
  BI: 'Burundi',
  KH: 'Cambodia',
  CM: 'Cameroon',
  CA: 'Canada',
  CV: 'Cape Verde',
  KY: 'Cayman Islands',
  TD: 'Chad',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  KM: 'Comoros',
  CG: 'Congo',
  CK: 'Cook Islands',
  CR: 'Costa Rica',
  CI: "Cote D'Ivoire",
  HR: 'Croatia',
  CU: 'Cuba',
  CW: 'Curacao',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  DJ: 'Djibouti',
  DM: 'Dominica',
  DO: 'Dominican Republic',
  EC: 'Ecuador',
  EG: 'Egypt',
  SV: 'El Salvador',
  GQ: 'Equatorial Guinea',
  ER: 'Eritrea',
  EE: 'Estonia',
  ET: 'Ethiopia',
  FO: 'Faroe Islands',
  FJ: 'Fiji',
  FI: 'Finland',
  FR: 'France',
  GA: 'Gabon',
  GM: 'Gambia',
  GE: 'Georgia',
  DE: 'Germany',
  GH: 'Ghana',
  GI: 'Gibraltar',
  GR: 'Greece',
  GL: 'Greenland',
  GD: 'Grenada',
  GP: 'Guadeloupe',
  GU: 'Guam',
  GT: 'Guatemala',
  GG: 'Guernsey',
  GN: 'Guinea',
  GW: 'Guinea-Bissau',
  GY: 'Guyana',
  HT: 'Haiti',
  HN: 'Honduras',
  HK: 'Hong Kong',
  HU: 'Hungary',
  IS: 'Iceland',
  IN: 'India',
  ID: 'Indonesia',
  IR: 'Iran',
  IQ: 'Iraq',
  IE: 'Ireland',
  IM: 'Isle of Man',
  IL: 'Israel',
  IT: 'Italy',
  JM: 'Jamaica',
  JP: 'Japan',
  JE: 'Jersey',
  JO: 'Jordan',
  KZ: 'Kazakhstan',
  KE: 'Kenya',
  KI: 'Kiribati',
  KR: 'South Korea',
  XK: 'Kosovo',
  KW: 'Kuwait',
  KG: 'Kyrgyzstan',
  LA: 'Lao',
  LV: 'Latvia',
  LB: 'Lebanon',
  LS: 'Lesotho',
  LR: 'Liberia',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MO: 'Macao',
  MK: 'Macedonia',
  MG: 'Madagascar',
  MW: 'Malawi',
  MY: 'Malaysia',
  MV: 'Maldives',
  ML: 'Mali',
  MT: 'Malta',
  MQ: 'Martinique',
  MR: 'Mauritania',
  MU: 'Mauritius',
  YT: 'Mayotte',
  MX: 'Mexico',
  FM: 'Micronesia',
  MD: 'Moldova',
  MC: 'Monaco',
  MN: 'Mongolia',
  ME: 'Montenegro',
  MS: 'Montserrat',
  MA: 'Morocco',
  MZ: 'Mozambique',
  MM: 'Myanmar',
  NA: 'Namibia',
  NR: 'Nauru',
  NP: 'Nepal',
  NL: 'Netherlands',
  NC: 'New Caledonia',
  NZ: 'New Zealand',
  NI: 'Nicaragua',
  NE: 'Niger',
  NG: 'Nigeria',
  NU: 'Niue',
  NF: 'Norfolk Island',
  NO: 'Norway',
  OM: 'Oman',
  PK: 'Pakistan',
  PW: 'Palau',
  PS: 'Palestine',
  PA: 'Panama',
  PG: 'Papua New Guinea',
  PY: 'Paraguay',
  PE: 'Peru',
  PH: 'Philippines',
  PN: 'Pitcairn',
  PL: 'Poland',
  PT: 'Portugal',
  PR: 'Puerto Rico',
  QA: 'Qatar',
  RE: 'Reunion',
  RO: 'Romania',
  RU: 'Russia',
  RW: 'Rwanda',
  WS: 'Samoa',
  SM: 'San Marino',
  SA: 'Saudi Arabia',
  SN: 'Senegal',
  RS: 'Serbia',
  SC: 'Seychelles',
  SL: 'Sierra Leone',
  SG: 'Singapore',
  SX: 'Sint Maarten',
  SK: 'Slovakia',
  SI: 'Slovenia',
  SB: 'Solomon Islands',
  SO: 'Somalia',
  ZA: 'South Africa',
  GS: 'South Georgia',
  SS: 'South Sudan',
  ES: 'Spain',
  LK: 'Sri Lanka',
  SD: 'Sudan',
  SR: 'Suriname',
  SJ: 'Svalbard and Jan Mayen',
  SZ: 'Swaziland',
  SE: 'Sweden',
  CH: 'Switzerland',
  SY: 'Syrian Arab Republic',
  TW: 'Taiwan',
  TJ: 'Tajikistan',
  TZ: 'Tanzania',
  TH: 'Thailand',
  TL: 'Timor-Leste',
  TG: 'Togo',
  TK: 'Tokelau',
  TO: 'Tonga',
  TT: 'Trinidad and Tobago',
  TN: 'Tunisia',
  TR: 'Turkey',
  TM: 'Turkmenistan',
  TC: 'Turks and Caicos',
  TV: 'Tuvalu',
  UG: 'Uganda',
  UA: 'Ukraine',
  AE: 'United Arab Emirates',
  GB: 'United Kingdom',
  ['GB-ENG']: 'England',
  ['GB-NIR']: 'Northern Ireland',
  ['GB-SCT']: 'Scotland',
  ['GB-WLS']: 'Wales',
  US: 'United States',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',
  VU: 'Vanuatu',
  VE: 'Venezuela',
  VN: 'Viet Nam',
  WF: 'Wallis and Futuna',
  EH: 'Western Sahara',
  YE: 'Yemen',
  ZM: 'Zambia',
  ZW: 'Zimbabwe'
}

export type FlagCodes = keyof typeof COUNTRIES
