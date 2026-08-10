import { BaseCard, Prism } from '@skyweaver/state-metadata'
import { GameMode } from '@opensky/proto'

export const MODE_PARAM = 'mode' as const
export const DECK_PARAM = 'deck' as const
export const SESSION_PARAM = 'session' as const

export enum RewardType {
  EXP = 'EXP',
  CARD = 'CARD'
}

export interface Reward {
  type: RewardType
  description: string
  card?: number
  amount: number
  currentLevel: number
  levelUpXP: number
}

export interface Account {
  address: string
  name: string
  locale: string
  createdAt: string
  updatedAt: string
  experience: number
  level: number
  levelUpXP: number
  region?: string
  tagArtID?: string
  crystalID?: number
}

export interface PlayerDeck {
  cards: BaseCard[]
  prisms: Prism[]
}

export interface Config {
  verbose: boolean
  bots: BotConfig[]
}

export interface BotConfig {
  name?: string
  deck: PlayerDeck
  gameMode: GameMode
  difficulty: number
  moveDelay?: number
  mnemonic?: string
  subkeyMnemonic?: string
}
