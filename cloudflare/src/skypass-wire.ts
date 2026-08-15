import type {
  CardSet,
  DeckClass,
  ItemType,
  ListSkypassRewardsResponse,
  SkypassLevel,
  SkypassReward,
  SkypassTier
} from '@opensky/proto'

import { sourceRewardListWire, type SourceRewardInput } from './reward-wire'

type Nullable<T> = T | null | undefined

type SourceSkypassRewardAttributesInput = {
  tokenIDs?: readonly number[] | null
  cardSets?: readonly (CardSet | null)[] | null
  cardSetsExcluded?: readonly (CardSet | null)[] | null
  unlockDeckClasses?: readonly (DeckClass | null)[] | null
}

export type SourceSkypassRewardInput = {
  id: number
  level: number
  season: number
  tier?: Nullable<SkypassTier>
  itemType?: Nullable<ItemType>
  amount: number
  isStarter: boolean
  isInfinite: boolean
  attributes?: Nullable<SourceSkypassRewardAttributesInput>
  claimable: boolean
  claimed: boolean
  gainedRewards?: Nullable<readonly SourceRewardInput[]>
}

export type SourceSkypassLevelInput = {
  level: number
  earned: boolean
  rewards: readonly SourceSkypassRewardInput[]
}

export type SourceListSkypassRewardsInput = {
  levels: readonly SourceSkypassLevelInput[]
  seasonNumber: number
  seasonName: string
  hasPremium: boolean
}

const nonEmpty = <T>(values: readonly T[] | null | undefined) =>
  values?.length ? [...values] : undefined

const sourceSkypassRewardAttributesWire = (
  attributes: SourceSkypassRewardAttributesInput
) => {
  const tokenIDs = nonEmpty(attributes.tokenIDs)
  const cardSets = nonEmpty(attributes.cardSets)
  const cardSetsExcluded = nonEmpty(attributes.cardSetsExcluded)
  const unlockDeckClasses = nonEmpty(attributes.unlockDeckClasses)
  return {
    ...(tokenIDs ? { tokenIDs } : {}),
    ...(cardSets ? { cardSets } : {}),
    ...(cardSetsExcluded ? { cardSetsExcluded } : {}),
    ...(unlockDeckClasses ? { unlockDeckClasses } : {})
  }
}

/** Recreates encoding/json output for the generated Go SkyPass structs. */
export const sourceSkypassRewardWire = (
  reward: SourceSkypassRewardInput
): SkypassReward =>
  ({
    id: reward.id,
    level: reward.level,
    season: reward.season,
    tier: reward.tier ?? null,
    itemType: reward.itemType ?? null,
    ...(reward.amount === 0 ? {} : { amount: reward.amount }),
    isStarter: reward.isStarter,
    isInfinite: reward.isInfinite,
    ...(reward.attributes
      ? {
          attributes: sourceSkypassRewardAttributesWire(reward.attributes)
        }
      : {}),
    claimable: reward.claimable,
    claimed: reward.claimed,
    gainedRewards:
      reward.gainedRewards == null
        ? null
        : sourceRewardListWire(reward.gainedRewards)
  }) as unknown as SkypassReward

export const sourceSkypassRewardListWire = (
  rewards: readonly SourceSkypassRewardInput[]
): SkypassReward[] => rewards.map(sourceSkypassRewardWire)

export const sourceNullableSkypassRewardListWire = (
  rewards: readonly SourceSkypassRewardInput[] | null | undefined
): SkypassReward[] | null =>
  rewards?.length ? sourceSkypassRewardListWire(rewards) : null

export const sourceSkypassLevelWire = (
  level: SourceSkypassLevelInput
): SkypassLevel =>
  ({
    level: level.level,
    earned: level.earned,
    rewards: sourceNullableSkypassRewardListWire(level.rewards)
  }) as unknown as SkypassLevel

export const sourceListSkypassRewardsWire = (
  response: SourceListSkypassRewardsInput
): ListSkypassRewardsResponse =>
  ({
    levels: response.levels.length
      ? response.levels.map(sourceSkypassLevelWire)
      : null,
    seasonNumber: response.seasonNumber,
    seasonName: response.seasonName,
    hasPremium: response.hasPremium
  }) as unknown as ListSkypassRewardsResponse
