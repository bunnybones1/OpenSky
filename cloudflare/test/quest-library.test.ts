import { QuestPeriodicity, QuestType } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  questPeriodAt,
  SOURCE_QUEST_SPECS,
  sourceQuestCandidates,
  sourceQuestSpec
} from '../src/quest-library'

describe('source quest library', () => {
  it('loads the complete generated production library and epic mappings', () => {
    expect(SOURCE_QUEST_SPECS).toHaveLength(222)
    expect(sourceQuestSpec(QuestType.HerosJourney)).toMatchObject({
      numericalID: 1,
      epicType: 'hero_test',
      epicIndex: 1,
      epicLength: 5,
      rewardXp: 500
    })
    expect(sourceQuestSpec(QuestType.OntheRoadAgain)).toMatchObject({
      numericalID: 10,
      epicType: 'starter1_test',
      epicIndex: 1,
      epicLength: 3
    })
    expect(sourceQuestSpec(QuestType.Strengthweaver)).toMatchObject({
      numericalID: 13,
      rerollable: true,
      requiredMinLevel: 2
    })
  })

  it('uses the source season-one daily, weekly, and 28-day boundaries', () => {
    const start = new Date('2021-11-22T14:00:00.000Z')
    expect(questPeriodAt(QuestPeriodicity.DAILY, start)).toBe(1)
    expect(
      questPeriodAt(
        QuestPeriodicity.DAILY,
        new Date('2021-11-23T13:59:59.999Z')
      )
    ).toBe(1)
    expect(
      questPeriodAt(
        QuestPeriodicity.DAILY,
        new Date('2021-11-23T14:00:00.000Z')
      )
    ).toBe(2)
    expect(
      questPeriodAt(
        QuestPeriodicity.WEEKLY,
        new Date('2021-11-29T14:00:00.000Z')
      )
    ).toBe(2)
    expect(
      questPeriodAt(
        QuestPeriodicity.SEASONAL,
        new Date('2021-12-20T14:00:00.000Z')
      )
    ).toBe(2)
  })

  it('filters candidates by account level, owned heroes, and owned cards', () => {
    const candidates = sourceQuestCandidates({
      periodicity: QuestPeriodicity.DAILY,
      position: 1,
      level: 2,
      ownedHeroes: new Set(['ADA']),
      ownedCards: new Set([6, 68, 136, 137, 138, 139]),
      excludedQuestTypes: new Set()
    })
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every(spec => (spec.epicIndex || 1) === 1)).toBe(true)
    expect(
      candidates.every(
        spec => spec.requiredHero === null || spec.requiredHero === 'ADA'
      )
    ).toBe(true)
    expect(
      candidates.every(spec =>
        spec.requiredCards.every(card =>
          [6, 68, 136, 137, 138, 139].includes(card)
        )
      )
    ).toBe(true)
  })
})
