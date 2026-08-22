import { EpicType, ItemType, QuestPeriodicity, QuestType } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceNullableQuestWire,
  sourceQuestListWire,
  sourceQuestWire
} from '../src/quest-wire'

describe('source Quest JSON wire', () => {
  it('emits every generated field and explicit non-epic nulls', () => {
    expect(
      sourceQuestWire({
        id: 14,
        position: 2,
        questType: QuestType.OntheRoadAgain,
        progress: 1,
        endProgress: 3,
        reward: { itemType: ItemType.SW_XP, amount: 100 },
        periodicity: QuestPeriodicity.DAILY,
        isRerollable: true,
        isClaimable: false,
        isClaimed: false,
        isNew: true
      })
    ).toEqual({
      id: 14,
      position: 2,
      questType: 'OntheRoadAgain',
      epicType: null,
      epicIndex: null,
      epicLength: null,
      progress: 1,
      endProgress: 3,
      reward: { itemType: 'SW_XP', amount: 100 },
      periodicity: 'DAILY',
      isRerollable: true,
      isClaimable: false,
      isClaimed: false,
      isNew: true
    })
  })

  it('preserves epic values and nullable nested pointers', () => {
    expect(
      sourceQuestWire({
        id: 0,
        position: 1,
        questType: QuestType.AnEnemyApproaches,
        epicType: EpicType.starter2_test,
        epicIndex: 2,
        epicLength: 5,
        progress: 0,
        endProgress: 10,
        reward: { amount: 200 },
        isRerollable: false,
        isClaimable: false,
        isClaimed: false,
        isNew: false
      })
    ).toEqual({
      id: 0,
      position: 1,
      questType: 'AnEnemyApproaches',
      epicType: 'starter2_test',
      epicIndex: 2,
      epicLength: 5,
      progress: 0,
      endProgress: 10,
      reward: { itemType: null, amount: 200 },
      periodicity: null,
      isRerollable: false,
      isClaimable: false,
      isClaimed: false,
      isNew: false
    })
  })

  it('normalizes lists and nullable claim results', () => {
    expect(sourceNullableQuestWire(null)).toBeNull()
    expect(sourceQuestListWire([])).toEqual([])
  })
})
