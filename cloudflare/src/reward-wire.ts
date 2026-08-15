import type {
  ConquestV2TreasureProgress,
  RankData,
  Reward
} from '@opensky/proto'

import { sourceCardWire, type SourceCardInput } from './card-wire'
import { sourceItemWire, type SourceItemInput } from './item-wire'

type Nullable<T> = T | null | undefined

type SourceRankDataInput = RankData

export type SourceRewardInput = {
  accountID: number
  type: Reward['type']
  gameMode?: Nullable<Reward['gameMode']>
  rank?: Nullable<{
    beforeMatch?: Nullable<SourceRankDataInput>
    afterMatch?: Nullable<SourceRankDataInput>
  }>
  exp?: Nullable<{
    amount: number
    reason: NonNullable<Reward['exp']>['reason']
    reasonExtraData?: number | null
    currentLevel: number
    requiredExp: number
    beforeMatchExp: number
  }>
  card?: Nullable<{
    amount: number
    card?: Nullable<SourceCardInput>
    item?: Nullable<SourceItemInput>
  }>
  hero?: Nullable<NonNullable<Reward['hero']>>
  heroSkin?: Nullable<NonNullable<Reward['heroSkin']>>
  deck?: Nullable<{
    deckClass: NonNullable<Reward['deck']>['deckClass']
    tokenIds?: number[] | null
  }>
  conquestV2TreasureProgress?: Nullable<{
    beforeMatch?: Nullable<ConquestV2TreasureProgress>
    afterMatch?: Nullable<ConquestV2TreasureProgress>
  }>
  stickerPoints?: number | null
}

const sourceRankDataWire = (rank: SourceRankDataInput): RankData => ({
  rank: rank.rank,
  rankStage: rank.rankStage,
  requiredRankPoints: rank.requiredRankPoints,
  rankPosition: rank.rankPosition,
  score: rank.score,
  scoreAbove: rank.scoreAbove,
  scoreBelow: rank.scoreBelow
})

const sourceTreasureProgressWire = (
  progress: ConquestV2TreasureProgress
): ConquestV2TreasureProgress => ({
  treasureLevel: progress.treasureLevel,
  treasurePoints: progress.treasurePoints,
  treasurePointsRequired: progress.treasurePointsRequired
})

/**
 * Recreates encoding/json output for the generated Go Reward union.
 *
 * None of Reward's public fields use omitempty, so inactive variants and
 * nested pointers must remain explicit nulls. Projecting nested Card and Item
 * values also prevents Worker-only catalog or persistence metadata from
 * becoming part of the public contract.
 */
export const sourceRewardWire = (reward: SourceRewardInput): Reward =>
  ({
    accountID: reward.accountID,
    type: reward.type,
    gameMode: reward.gameMode ?? null,
    rank: reward.rank
      ? {
          beforeMatch: reward.rank.beforeMatch
            ? sourceRankDataWire(reward.rank.beforeMatch)
            : null,
          afterMatch: reward.rank.afterMatch
            ? sourceRankDataWire(reward.rank.afterMatch)
            : null
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
          card: reward.card.card ? sourceCardWire(reward.card.card) : null,
          item: reward.card.item ? sourceItemWire(reward.card.item) : null
        }
      : null,
    hero: reward.hero
      ? { hero: reward.hero.hero, deckClass: reward.hero.deckClass }
      : null,
    heroSkin: reward.heroSkin
      ? {
          hero: reward.heroSkin.hero,
          deckClass: reward.heroSkin.deckClass,
          tokenId: reward.heroSkin.tokenId
        }
      : null,
    deck: reward.deck
      ? {
          deckClass: reward.deck.deckClass,
          tokenIds: reward.deck.tokenIds ?? null
        }
      : null,
    conquestV2TreasureProgress: reward.conquestV2TreasureProgress
      ? {
          beforeMatch: reward.conquestV2TreasureProgress.beforeMatch
            ? sourceTreasureProgressWire(
                reward.conquestV2TreasureProgress.beforeMatch
              )
            : null,
          afterMatch: reward.conquestV2TreasureProgress.afterMatch
            ? sourceTreasureProgressWire(
                reward.conquestV2TreasureProgress.afterMatch
              )
            : null
        }
      : null,
    stickerPoints: reward.stickerPoints ?? null
  }) as unknown as Reward

export const sourceRewardListWire = (
  rewards: readonly SourceRewardInput[]
): Reward[] => rewards.map(sourceRewardWire)

// Source quest, SkyPass, and bot handlers build reward slices from nil. When
// no reward is appended, encoding/json emits null rather than an empty array.
export const sourceNullableRewardListWire = (
  rewards: readonly SourceRewardInput[] | null | undefined
): Reward[] | null => (rewards?.length ? sourceRewardListWire(rewards) : null)
