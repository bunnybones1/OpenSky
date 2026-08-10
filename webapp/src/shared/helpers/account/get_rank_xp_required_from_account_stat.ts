import { AccountStat } from '~/lib/proto'

import { getNextRankInfo } from './get-next-rank'

export interface Props {
  currentPoints: number
  rankUpPointsNeeded: number
}

export const getRankXPRequiredFromAccountStat = (
  accountStat?: AccountStat
): Props => {
  if (!accountStat || !accountStat.playerRankStage || !accountStat.playerRank) {
    return { currentPoints: 0, rankUpPointsNeeded: 0 }
  }

  const { rankUpAmount, rankUpCurrency } = getNextRankInfo(accountStat)

  return {
    currentPoints:
      rankUpCurrency === 'RP'
        ? accountStat.score || 0
        : rankUpCurrency === 'XP'
        ? accountStat.experience || 0
        : 0,
    rankUpPointsNeeded: rankUpAmount
  }
}
