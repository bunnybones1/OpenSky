import { PlayerRank } from '@opensky/proto'

import { RANKS_WITH_STAGES } from '~/shared/constants/ranks'
import { Mutable } from '~/shared/types/utility'

export const doesRankHaveStages = (playerRank: PlayerRank) => {
  return (
    RANKS_WITH_STAGES as Mutable<typeof RANKS_WITH_STAGES> as PlayerRank[]
  ).includes(playerRank)
}
