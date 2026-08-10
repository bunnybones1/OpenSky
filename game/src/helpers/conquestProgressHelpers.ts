import { ConquestMatchResult } from '@opensky/proto'

import {
  conquestDataHelper,
  deduceCurrentMatchNum,
  matchProgressToArray
} from './conquestDataHelper'

type PrematchConquestProgress = {
  initProgress: number
  currentMatch: 0 | 1 | 2
  matchProgress: ConquestMatchResult[]
}

let cachedPrematchConquestProgress: PrematchConquestProgress | undefined

export async function getPrematchConquestProgress(): Promise<PrematchConquestProgress> {
  if (cachedPrematchConquestProgress) {
    return cachedPrematchConquestProgress
  }
  let initProgress = 0

  const prematchConquestStatus =
    await conquestDataHelper.getPrematchConquestStatus()
  let currentMatch: 0 | 1 | 2 = 0
  let matchProgress: ConquestMatchResult[] = []
  if (prematchConquestStatus?.conquest) {
    matchProgress = matchProgressToArray(
      prematchConquestStatus.conquest.matchProgress
    )
    currentMatch = deduceCurrentMatchNum(matchProgress)
    initProgress = currentMatch / (matchProgress.length - 1)
  }

  const result = { initProgress, currentMatch, matchProgress }
  cachedPrematchConquestProgress = result
  return result
}
