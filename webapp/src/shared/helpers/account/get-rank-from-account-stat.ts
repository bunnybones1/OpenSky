import { AccountStat, PlayerRank } from '~/lib/proto'

export const getRankFromAccountStat = (accountStat?: AccountStat): PlayerRank => {
  if (
    !accountStat ||
    !accountStat.playerRank ||
    accountStat.playerRank === PlayerRank.UNKNOWN
  ) {
    return PlayerRank.UNRANKED
  }

  return accountStat.playerRank
}
