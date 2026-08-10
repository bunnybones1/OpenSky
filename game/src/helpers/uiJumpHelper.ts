import { makeSafetyCheckFromConstStringArray } from '@opensky/shared/typeHelpers'

import queryParams from '~/queryParams'

const UIJumpKeyStrings = [
  'endReview',
  'conquestSummary',
  'conquestPrizes',
  'rankReward',
  'heroesReward',
  'xp',
  'pityGolds',
  'baseCards'
] as const

type UIJumpKey = (typeof UIJumpKeyStrings)[number]

const isUIJumpKey = makeSafetyCheckFromConstStringArray(UIJumpKeyStrings)

export function uiJump(key: UIJumpKey) {
  const query = queryParams.uiJump
  if (query === null) {
    return true
  } else if (isUIJumpKey(query)) {
    return key === query
  } else {
    throw new Error(
      `"${query}" not a supported uiJump value. Use one of these: [${UIJumpKeyStrings.map(
        s => `"${s}"`
      ).join(', ')}]`
    )
    return false
  }
}
