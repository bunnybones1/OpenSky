import { Infer } from 'myzod'

import * as cell from '../cellTypes'
import { createRecordSchema } from '../record'
import * as s from './sheetValidate'
import { _bareQuestSchema } from './single/struct'
import * as q from './single/validate'

export const QuestSchema = _bareQuestSchema.withPredicate(
  q.endProgressIsGreaterThanStartProgress
)
export const QuestsSheetSchema = createRecordSchema(
  QuestSchema,
  cell.questID
).withPredicate(s.namesAreUnique)
export type QuestsSheetType = Infer<typeof QuestsSheetSchema>
