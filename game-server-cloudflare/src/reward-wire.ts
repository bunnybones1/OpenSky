import { RewardType, type Reward } from '@opensky/proto'

export interface SourceMatchEndRewardPhases {
  rankAndStats: Reward[]
  matchExperience: Reward[]
  conquestCards: Reward[]
  conquestPoints: Reward[]
}

/**
 * Recreates the JSON shape produced by encoding/json for proto.Reward.
 *
 * The generated Go structs deliberately do not use `omitempty`: inactive
 * reward variants and nested pointer fields are serialized as null. The
 * generated TypeScript interfaces model those pointers as optional, so a
 * normal JSON.stringify would otherwise remove them from match-completion,
 * reconnect, and recent-match payloads.
 */
export const sourceRewardWire = (reward: Reward): Reward =>
  ({
    accountID: reward.accountID,
    type: reward.type,
    gameMode: reward.gameMode ?? null,
    rank: reward.rank
      ? {
          beforeMatch: reward.rank.beforeMatch ?? null,
          afterMatch: reward.rank.afterMatch ?? null
        }
      : null,
    exp: reward.exp
      ? {
          amount: reward.exp.amount,
          reason: reward.exp.reason,
          reasonExtraData: reward.exp.reasonExtraData ?? null,
          currentLevel: reward.exp.currentLevel,
          requiredExp: reward.exp.requiredExp,
          beforeMatchExp: reward.exp.beforeMatchExp
        }
      : null,
    card: reward.card
      ? {
          amount: reward.card.amount,
          card: reward.card.card ?? null,
          item: reward.card.item ?? null
        }
      : null,
    hero: reward.hero ?? null,
    heroSkin: reward.heroSkin ?? null,
    deck: reward.deck
      ? {
          deckClass: reward.deck.deckClass,
          tokenIds: reward.deck.tokenIds ?? null
        }
      : null,
    conquestV2TreasureProgress: reward.conquestV2TreasureProgress
      ? {
          beforeMatch: reward.conquestV2TreasureProgress.beforeMatch ?? null,
          afterMatch: reward.conquestV2TreasureProgress.afterMatch ?? null
        }
      : null,
    stickerPoints: reward.stickerPoints ?? null
  }) as unknown as Reward

export const sourceRewardListWire = (rewards: Reward[]): Reward[] =>
  rewards.map(sourceRewardWire)

/**
 * Reassembles the per-player reward list in the same producer order as the Go
 * InternalMatchEnd path. applyMatchExperience persists the MatchXPAwarder EXP
 * rewards and the later MatchXPUpdater promotion reward in one receipt, so the
 * phase boundary has to be recovered before Conquest rewards are inserted.
 */
export const sourceMatchEndRewardListWire = ({
  rankAndStats,
  matchExperience,
  conquestCards,
  conquestPoints
}: SourceMatchEndRewardPhases): Reward[] => {
  if (
    rankAndStats.some(
      reward =>
        reward.type !== RewardType.EXP && reward.type !== RewardType.RANK
    )
  ) {
    throw new Error('match rank/stat reward receipt has an invalid phase')
  }

  const promotionIndex = matchExperience.findIndex(
    reward => reward.type === RewardType.RANK
  )
  const matchExperienceEnd =
    promotionIndex < 0 ? matchExperience.length : promotionIndex
  const matchExperienceRewards = matchExperience.slice(0, matchExperienceEnd)
  const levelUpRewards = matchExperience.slice(matchExperienceEnd)
  if (
    matchExperienceRewards.some(reward => reward.type !== RewardType.EXP) ||
    levelUpRewards.some(reward => reward.type !== RewardType.RANK)
  ) {
    throw new Error('match experience reward receipt has an invalid phase')
  }
  if (conquestCards.some(reward => reward.type !== RewardType.CARD)) {
    throw new Error('Conquest card reward receipt has an invalid phase')
  }
  if (
    conquestPoints.some(reward => reward.type !== RewardType.CONQUEST_POINTS)
  ) {
    throw new Error('Conquest point reward receipt has an invalid phase')
  }

  return sourceRewardListWire([
    ...rankAndStats,
    ...matchExperienceRewards,
    ...conquestCards,
    ...conquestPoints,
    ...levelUpRewards
  ])
}
