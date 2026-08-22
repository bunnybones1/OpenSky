import type { EpicType, QuestPeriodicity, QuestType } from '@opensky/proto'

import generatedSpecs from '../../lib/quests/sheet_imported/prod.json'

type QuestPosition = 1 | 2 | 3

interface GeneratedQuestSpec {
  id: string
  numericalID: number
  artID: string
  description: string
  name: string
  epic?: number
  epicIndex?: number
  rerollable: boolean
  periodicity: QuestPeriodicity
  column: QuestPosition
  requiredHero: string | null
  startProgress: number
  endProgress: number
  rewardXp: number
  requiredCards: Array<number | string>
  requiredMinLevel: number | null
  requiredMaxLevel: number | null
}

export interface SourceQuestSpec {
  questType: QuestType
  numericalID: number
  artID: string
  description: string
  name: string
  epicType?: EpicType
  epicIndex?: number
  epicLength?: number
  rerollable: boolean
  periodicity: QuestPeriodicity
  position: QuestPosition
  requiredHero: string | null
  startProgress: number
  endProgress: number
  rewardXp: number
  requiredCards: number[]
  requiredMinLevel: number | null
  requiredMaxLevel: number | null
}

const EPIC_TYPE_BY_NUMBER: Record<number, EpicType> = {
  1: 'hero_test' as EpicType,
  2: 'starter2_test' as EpicType,
  3: 'starter1_test' as EpicType,
  4: 'ff_test' as EpicType,
  5: 'dd_test' as EpicType,
  6: 'nav_test' as EpicType,
  7: 'baboon_test' as EpicType,
  8: 'wd_test' as EpicType,
  9: 'fren_test' as EpicType
}

const rawSpecs = generatedSpecs as GeneratedQuestSpec[]
const epicLengths = new Map<number, number>()
for (const spec of rawSpecs) {
  if (spec.epic === undefined || spec.epicIndex === undefined) continue
  epicLengths.set(
    spec.epic,
    Math.max(epicLengths.get(spec.epic) || 0, spec.epicIndex)
  )
}

export const SOURCE_QUEST_SPECS: readonly SourceQuestSpec[] = rawSpecs.map(
  spec => ({
    questType: spec.id as QuestType,
    numericalID: spec.numericalID,
    artID: spec.artID,
    description: spec.description,
    name: spec.name,
    ...(spec.epic === undefined
      ? {}
      : {
          epicType: EPIC_TYPE_BY_NUMBER[spec.epic],
          epicIndex: spec.epicIndex,
          epicLength: epicLengths.get(spec.epic)
        }),
    rerollable: spec.rerollable,
    periodicity: spec.periodicity,
    position: spec.column,
    requiredHero: spec.requiredHero,
    startProgress: spec.startProgress,
    endProgress: spec.endProgress,
    rewardXp: spec.rewardXp,
    requiredCards: spec.requiredCards.map(Number),
    requiredMinLevel: spec.requiredMinLevel,
    requiredMaxLevel: spec.requiredMaxLevel
  })
)

const specsByQuestType = new Map(
  SOURCE_QUEST_SPECS.map(spec => [spec.questType, spec])
)

const SEASON_ONE_START_MS = Date.UTC(2021, 10, 22, 14)
const PERIOD_MS: Record<QuestPeriodicity, number> = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  SEASONAL: 28 * 24 * 60 * 60 * 1000,
  UNKNOWN: 0
} as Record<QuestPeriodicity, number>

export const questPeriodAt = (
  periodicity: QuestPeriodicity,
  at = new Date()
): number => {
  const duration = PERIOD_MS[periodicity]
  if (!duration) throw new Error(`invalid quest periodicity: ${periodicity}`)
  return Math.floor((at.getTime() - SEASON_ONE_START_MS) / duration) + 1
}

export const sourceQuestSpec = (
  questType: QuestType
): SourceQuestSpec | undefined => specsByQuestType.get(questType)

export const nextSourceEpicSpec = (
  spec: SourceQuestSpec
): SourceQuestSpec | undefined => {
  if (!spec.epicType || spec.epicIndex === undefined) return undefined
  return SOURCE_QUEST_SPECS.find(
    candidate =>
      candidate.epicType === spec.epicType &&
      candidate.epicIndex === spec.epicIndex! + 1
  )
}

const meetsRequirements = (
  spec: SourceQuestSpec,
  level: number,
  ownedHeroes: ReadonlySet<string>,
  ownedCards: ReadonlySet<number>
): boolean => {
  if (spec.requiredHero && !ownedHeroes.has(spec.requiredHero)) return false
  if (spec.requiredCards.some(card => !ownedCards.has(card))) return false
  if (spec.requiredMinLevel !== null && level < spec.requiredMinLevel) {
    return false
  }
  if (spec.requiredMaxLevel !== null && level > spec.requiredMaxLevel) {
    return false
  }
  return true
}

export interface QuestCandidateOptions {
  periodicity: QuestPeriodicity
  position: QuestPosition
  level: number
  ownedHeroes: ReadonlySet<string>
  ownedCards: ReadonlySet<number>
  excludedQuestTypes: ReadonlySet<QuestType>
  previousSpec?: SourceQuestSpec
}

/** Mirrors api/lib/quests/assigner.go newSpecs/filterWithValidRequirements. */
export const sourceQuestCandidates = (
  options: QuestCandidateOptions
): SourceQuestSpec[] => {
  const queryResults = SOURCE_QUEST_SPECS.filter(spec => {
    if (
      spec.periodicity !== options.periodicity ||
      spec.position !== options.position ||
      options.excludedQuestTypes.has(spec.questType)
    ) {
      return false
    }
    return !(
      options.previousSpec?.epicType &&
      spec.epicType === options.previousSpec.epicType
    )
  })

  const laterEpicSpecs = new Map<EpicType, SourceQuestSpec[]>()
  for (const spec of queryResults) {
    if (!spec.epicType || (spec.epicIndex || 0) <= 1) continue
    const entries = laterEpicSpecs.get(spec.epicType) || []
    entries.push(spec)
    laterEpicSpecs.set(spec.epicType, entries)
  }

  return queryResults.filter(spec => {
    if ((spec.epicIndex || 1) > 1) return false
    if (
      !meetsRequirements(
        spec,
        options.level,
        options.ownedHeroes,
        options.ownedCards
      )
    ) {
      return false
    }
    return (spec.epicType ? laterEpicSpecs.get(spec.epicType) || [] : []).every(
      epicSpec =>
        meetsRequirements(
          epicSpec,
          options.level,
          options.ownedHeroes,
          options.ownedCards
        )
    )
  })
}

export const randomSourceQuestSpec = (
  specs: readonly SourceQuestSpec[]
): SourceQuestSpec | undefined => {
  if (!specs.length) return undefined
  const random = crypto.getRandomValues(new Uint32Array(1))[0]
  return specs[random % specs.length]
}
