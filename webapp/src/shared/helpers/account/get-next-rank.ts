import { NUM_GRANDWEAVERS } from '@opensky/shared/constants'

import { AccountStat, PlayerRank, PlayerRankStage } from '~/lib/proto'
import {
  PlayerRankWithoutStage,
  PlayerRankWithStage,
  RANK_AND_STAGE_ORDER
} from '~/shared/constants/ranks'

export interface NextRank {
  nextPlayerRank: PlayerRank
  nextPlayerRankStage: PlayerRankStage
  nextPlayerRankPos: number | undefined
  rankUpAmount: number
  rankUpCurrency: 'XP' | 'RP' | undefined
}

const DEFAULT_RETURN: NextRank = {
  nextPlayerRank: PlayerRank.UNKNOWN,
  nextPlayerRankStage: PlayerRankStage.STAGE_NONE,
  nextPlayerRankPos: undefined,
  rankUpAmount: 0,
  rankUpCurrency: undefined
}

export const getNextRankInfo = (accountStat?: AccountStat): NextRank => {
  if (!accountStat) return DEFAULT_RETURN

  const currentRankKey =
    `${accountStat.playerRank}_${accountStat.playerRankStage}` as
      | PlayerRankWithoutStage
      | PlayerRankWithStage

  const nextRankInfo = RANK_AND_STAGE_ORDER[currentRankKey]

  if (!nextRankInfo) return DEFAULT_RETURN

  if (
    nextRankInfo.playerRank === PlayerRank.GRANDWEAVER &&
    accountStat.playerRank === PlayerRank.MASTER
  ) {
    return {
      nextPlayerRank:
        accountStat.rank === 1 ? PlayerRank.GRANDWEAVER : PlayerRank.MASTER,
      nextPlayerRankStage: PlayerRankStage.STAGE_NONE,
      nextPlayerRankPos: !accountStat.rank
        ? undefined
        : accountStat.rank === 1
        ? NUM_GRANDWEAVERS
        : accountStat.rank - 1,
      rankUpAmount: nextRankInfo.rankUpAmount,
      rankUpCurrency: nextRankInfo.rankUpCurrency
    }
  }

  if (
    nextRankInfo.playerRank === PlayerRank.GRANDWEAVER &&
    accountStat.playerRank === PlayerRank.GRANDWEAVER
  ) {
    return {
      nextPlayerRank: PlayerRank.GRANDWEAVER,
      nextPlayerRankStage: PlayerRankStage.STAGE_NONE,
      nextPlayerRankPos: !accountStat.rank
        ? undefined
        : accountStat.rank === 1
        ? 1
        : accountStat.rank - 1,
      rankUpAmount: nextRankInfo.rankUpAmount,
      rankUpCurrency: nextRankInfo.rankUpCurrency
    }
  }

  return {
    nextPlayerRank: nextRankInfo.playerRank,
    nextPlayerRankStage: nextRankInfo.playerRankStage,
    nextPlayerRankPos: undefined,
    rankUpAmount: nextRankInfo.rankUpAmount,
    rankUpCurrency: nextRankInfo.rankUpCurrency
  }
}
