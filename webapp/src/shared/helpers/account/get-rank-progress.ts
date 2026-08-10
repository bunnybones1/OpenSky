import { WINS_TO_RANK_UP } from '@opensky/shared/constants'

import { AccountStat, PlayerRank } from '~/lib/proto'

export const getRankProgress = (accountStat?: AccountStat): number[] => {
  const playerRank =
    !accountStat ||
    !accountStat.playerRank ||
    accountStat.playerRank === PlayerRank.UNKNOWN
      ? PlayerRank.UNRANKED
      : accountStat.playerRank

  const playerRankScore = !accountStat ? 0 : accountStat.score || 0

  const winsRequired = WINS_TO_RANK_UP[playerRank]
  const progressArr = Array.from(new Array(winsRequired))

  return progressArr.map((_, index) => {
    const normalized = playerRankScore - (index + 1)
    if (normalized === -0.5) return 0.5
    if (normalized > -1) return 1
    return 0
  })
}
