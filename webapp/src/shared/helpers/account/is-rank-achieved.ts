import { PlayerRank } from '~/lib/proto'
import { RANKS } from '~/shared/constants/accounts'

export const isRankAchieved = (
  rankToEval: PlayerRank,
  playerRank: PlayerRank
): boolean => {
  const rankIndex = RANKS.indexOf(playerRank)
  return rankIndex >= RANKS.indexOf(rankToEval)
}
