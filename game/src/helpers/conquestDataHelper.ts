import {
  ConquestMatchResult,
  ConquestStatus,
  ConquestStatusReturn,
  GameMode,
  Hero
} from '@opensky/proto'
import { SKYWEAVER_JWT_KEY } from '@opensky/shared/constants'

import apiClient from '~/apiClient'
import queryParams from '~/queryParams'

const fakeCurrentConquestMatch = queryParams.fakeConquest
function getFakeMatchProgress(matchNum: number) {
  return fakeCurrentConquestMatch > matchNum
    ? ConquestMatchResult.WIN
    : ConquestMatchResult.UNKNOWN
}
const __fakeData: ConquestStatusReturn = {
  conquest: {
    id: 9999,
    status: ConquestStatus.IN_PROGRESS,
    nonce: 12345,
    mode: GameMode.CONQUEST_DISCOVERY,
    hero: Hero.ADA,
    matchProgress: {
      1: getFakeMatchProgress(0),
      2: getFakeMatchProgress(1),
      3: getFakeMatchProgress(2)
    },
    createdAt: '00000',
    endedAt: '00001'
  }
}

class ConquestDataHelper {
  useFakeConquestData = false
  private _prematchConquestStatus: ConquestStatusReturn | undefined
  async getPrematchConquestStatus(): Promise<ConquestStatusReturn | undefined> {
    if (!this.useFakeConquestData) {
      if (!this._prematchConquestStatus) {
        try {
          const jwt = window.localStorage.getItem(SKYWEAVER_JWT_KEY)
          if (jwt) {
            this._prematchConquestStatus = await apiClient.conquestStatus()
          } else {
            console.warn('no JWT found!')
            return undefined
          }
        } catch (err) {
          console.error(err)
          return undefined
        }
      }
      return this._prematchConquestStatus
    } else {
      return __fakeData
    }
  }
}
export const conquestDataHelper = new ConquestDataHelper()

const __ASSUMED_MATCHES_PER_CONQUEST = 3
export function matchProgressToArray(
  matchProgress: {
    [key: number]: ConquestMatchResult
  } | null
) {
  if (!matchProgress) {
    //TODO cleanup needed
    //The server sometimes returns null, but type does not officially support it
    return [
      ConquestMatchResult.UNKNOWN,
      ConquestMatchResult.UNKNOWN,
      ConquestMatchResult.UNKNOWN
    ]
  }
  const keys = Object.keys(matchProgress)
    .sort()
    .map(numStr => parseInt(numStr))
    .filter(key => matchProgress[key] !== ConquestMatchResult.DRAW) // completely ignore draws
  const arr: ConquestMatchResult[] = new Array(
    Math.max(keys.length, __ASSUMED_MATCHES_PER_CONQUEST)
  ) //TODO cleanup hack to enforce 3 matches assumption
  for (let i = 0; i < keys.length; i++) {
    arr[i] = matchProgress[keys[i]]
  }
  //TODO cleanup hack to enforce 3 matches assumption
  while (arr.length < __ASSUMED_MATCHES_PER_CONQUEST) {
    arr.push(ConquestMatchResult.UNKNOWN)
  }
  return arr
}

export function deduceCurrentMatchNum(matchProgress: {
  [key: number]: ConquestMatchResult
}): 0 | 1 | 2 {
  const matchProgressArr = matchProgressToArray(matchProgress)
  const matchNum = matchProgressArr.reduce((sum, match) => {
    return (
      sum +
      (match === ConquestMatchResult.WIN || match === ConquestMatchResult.LOSS
        ? 1
        : 0)
    )
  }, 0)
  if (!(matchNum === 0 || matchNum === 1 || matchNum === 2)) {
    throw new Error(
      `invalid Conquest match number ${matchNum}. Expected 0, 1, or 2`
    )
  }
  return matchNum
}
