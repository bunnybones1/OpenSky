import { ValidationError } from 'myzod'

import { Quest } from './single/struct'

const DISABLED_QUEST_MIN_LVL = 9999
export function namesAreUnique(quests: Record<string, Quest>) {
  const questErrors: Record<string, ValidationError> = {}
  const questMinLevelsByName: Map<string, { minLevel: number; id: string }> =
    new Map()
  for (const [thisQuestID, quest] of Object.entries(quests)) {
    const alreadyLvl = questMinLevelsByName.get(quest.name)
    if (
      alreadyLvl !== undefined &&
      alreadyLvl?.minLevel < DISABLED_QUEST_MIN_LVL &&
      quest.requiredMinLevel !== undefined &&
      quest.requiredMinLevel < DISABLED_QUEST_MIN_LVL
    ) {
      questErrors[thisQuestID] = new ValidationError(
        `This quest has the same name as quest ${alreadyLvl.id}, but neither of them are disabled (min level ${quest.requiredMinLevel} => ${DISABLED_QUEST_MIN_LVL}).`
      )
      questErrors[alreadyLvl.id] = new ValidationError(
        `This quest has the same name as quest ${thisQuestID}, but neither of them are disabled (min level ${alreadyLvl.minLevel} => ${DISABLED_QUEST_MIN_LVL}).`
      )
    }
    questMinLevelsByName.set(quest.name, {
      id: thisQuestID,
      minLevel: Math.min(
        alreadyLvl?.minLevel ?? 99999999999,
        quest.requiredMinLevel ?? 99999999999
      )
    })
  }
  if (Object.keys(questErrors).length > 0) {
    throw new ValidationError(
      'Invalid Quest Description(s)',
      undefined,
      questErrors
    )
  }
  return true
}
