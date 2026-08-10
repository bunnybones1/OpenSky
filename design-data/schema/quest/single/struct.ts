import t, { Infer } from 'myzod'

import * as cell from '../../cellTypes'

export const _bareQuestSchema = t
  .object({
    periodicity: cell.questPeriodicity,
    rerollable: t.boolean(),
    // TODO epics..
    // epic?: (typeof Epic)[keyof typeof Epic],
    // epicIndex?: t.number(),
    baseCardArt: cell.cardID,
    name: t.string(),
    description: t.string(),
    designedDifficulty: cell.questDesignedDifficulty,
    column: cell.questColumn,
    startProgress: t
      .number({
        min: 0
      })
      .optional(),
    endProgress: t.number({
      min: 1
    }),
    requiredHero: cell.hero.optional(),
    requiredCards: cell.listOfCardIDs,
    requiredMinLevel: t
      .number({
        min: 0
      })
      .optional(),
    requiredMaxLevel: t
      .number({
        min: 0
      })
      .optional(),
    rewardXp: t.number({
      min: 0
    })
  })
  .collectErrors()
export type Quest = Infer<typeof _bareQuestSchema>
