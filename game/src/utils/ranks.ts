import { PlayerRank, PlayerRankStage } from '@opensky/proto'
import { ExpectNever, Overlaps } from '@opensky/shared/types'

export const playerRankOrder = [
  PlayerRank.UNRANKED,
  PlayerRank.WANDERER,
  PlayerRank.TRAINEE,
  PlayerRank.APPRENTICE,
  PlayerRank.EXPERT,
  PlayerRank.MASTER,
  PlayerRank.GRANDWEAVER,
  PlayerRank.UNKNOWN
] as const

export const playerRankStageOrder = [
  PlayerRankStage.STAGE_I,
  PlayerRankStage.STAGE_II,
  PlayerRankStage.STAGE_III,
  PlayerRankStage.STAGE_NONE
] as const

export function nextRank(rank: PlayerRank): PlayerRank | undefined {
  const idx = playerRankOrder.indexOf(rank)

  // we off-by-one the end so we never return UNKNOWN
  if (idx !== -1 && idx < playerRankOrder.length - 1) {
    return playerRankOrder[idx + 1]
  } else {
    return undefined
  }
}

export function nextRankStage(stage: PlayerRankStage): PlayerRankStage {
  const idx = playerRankStageOrder.indexOf(stage)

  // if we are stage III then next stage is I
  if (idx === 2 || idx === 3) {
    return playerRankStageOrder[0]
  }

  if (idx !== -1 && idx < playerRankStageOrder.length - 1) {
    return playerRankStageOrder[idx + 1]
  }
  return playerRankStageOrder[playerRankStageOrder.length - 1]
}

type Overlap = Overlaps<[PlayerRank, (typeof playerRankOrder)[number]]>[3]

type AnyRankIsExhaustive = ExpectNever<
  PlayerRank extends Overlap ? never : ['Missing rank!']
>
void undefined as AnyRankIsExhaustive
const _assertAnyRankHasNoExtraKeys: readonly PlayerRank[] = playerRankOrder
void _assertAnyRankHasNoExtraKeys

export const rankNames: { [K in PlayerRank]: string } = {
  TRAINEE: 'TRAINEE',
  GRANDWEAVER: 'GRANDWEAVER',
  MASTER: 'MASTER',
  EXPERT: 'EXPERT',
  WANDERER: 'WANDERER',
  APPRENTICE: 'APPRENTICE',
  UNRANKED: 'UNRANKED',
  UNKNOWN: 'UNKNOWN'
}
