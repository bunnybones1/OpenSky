import { GameMode, PlayerRank } from '@opensky/proto'
import { Color } from 'three'

import { Easing } from '~/systems/animation/Easing'

export type RankedGameMode =
  | GameMode.RANKED_DISCOVERY
  | GameMode.RANKED_CONSTRUCTED

export const BADGE_SIZE = 140
export const GOAL_BADGE_SIZE = 90

export const lightPurple = new Color(0x705bab)

export const getRankColor = (rank: PlayerRank, direction: 'up' | 'down') =>
  (rankColors[rank] || rankColors[PlayerRank.UNKNOWN]!)[direction]

const eloDecreaseColor = new Color(0xff6086)
const segmentActiveColor = new Color(0xfdb002)
export const flashColor = new Color(1, 1, 1)

const rankColors: Partial<{ [key in PlayerRank]: { up: Color; down: Color } }> =
  {
    [PlayerRank.GRANDWEAVER]: {
      up: new Color(0xe6a6a6),
      down: eloDecreaseColor
    },
    [PlayerRank.MASTER]: {
      up: new Color(0xffc051),
      down: eloDecreaseColor
    },
    [PlayerRank.UNKNOWN]: {
      up: segmentActiveColor,
      down: segmentActiveColor
    }
  }

export const rankChangeTime = (type: 'begin' | 'end' | false | true) =>
  type ? 500 : 800
export const rankChangeEase = (type: 'begin' | 'end' | false | true) =>
  type === 'begin' ? Easing.Quadratic.In : Easing.Quadratic.Out

const gameModePaths: Partial<{ [key in GameMode]: string }> = {
  [GameMode.RANKED_CONSTRUCTED]: 'constructed',
  [GameMode.RANKED_DISCOVERY]: 'discovery'
}

export const getGameModePath = (gameMode: GameMode) =>
  gameModePaths[gameMode] || gameModePaths[GameMode.RANKED_CONSTRUCTED]!
