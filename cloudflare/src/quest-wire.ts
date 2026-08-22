import type { Quest } from '@opensky/proto'

type SourceQuestRewardInput = {
  itemType?: NonNullable<Quest['reward']>['itemType'] | null
  amount: number
}

export type SourceQuestInput = {
  id: number
  position: number
  questType?: Quest['questType'] | null
  epicType?: Quest['epicType'] | null
  epicIndex?: number | null
  epicLength?: number | null
  progress: number
  endProgress: number
  reward?: SourceQuestRewardInput | null
  periodicity?: Quest['periodicity'] | null
  isRerollable: boolean
  isClaimable: boolean
  isClaimed: boolean
  isNew: boolean
}

/** Recreates encoding/json output for the generated Go Quest structs. */
export const sourceQuestWire = (quest: SourceQuestInput): Quest =>
  ({
    id: quest.id,
    position: quest.position,
    questType: quest.questType ?? null,
    epicType: quest.epicType ?? null,
    epicIndex: quest.epicIndex ?? null,
    epicLength: quest.epicLength ?? null,
    progress: quest.progress,
    endProgress: quest.endProgress,
    reward: quest.reward
      ? {
          itemType: quest.reward.itemType ?? null,
          amount: quest.reward.amount
        }
      : null,
    periodicity: quest.periodicity ?? null,
    isRerollable: quest.isRerollable,
    isClaimable: quest.isClaimable,
    isClaimed: quest.isClaimed,
    isNew: quest.isNew
  }) as unknown as Quest

export const sourceQuestListWire = (
  quests: readonly SourceQuestInput[]
): Quest[] => quests.map(sourceQuestWire)

export const sourceNullableQuestWire = (
  quest: SourceQuestInput | null | undefined
): Quest | null => (quest ? sourceQuestWire(quest) : null)
