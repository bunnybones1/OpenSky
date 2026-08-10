import { AccountStat, PlayerRankStage } from '~/lib/proto'

export const getRankStageFromAccountStat = (
  accountStat?: AccountStat
): PlayerRankStage => {
  if (
    !accountStat ||
    !accountStat.playerRankStage ||
    accountStat.playerRankStage === PlayerRankStage.STAGE_NONE
  ) {
    return PlayerRankStage.STAGE_NONE
  }

  return accountStat.playerRankStage
}
