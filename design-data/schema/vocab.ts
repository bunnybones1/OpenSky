import t, { Infer, ObjectType, keySignature } from 'myzod'

import * as cell from './cellTypes'
import { createRecordSchema } from './record'

export const VocabSchema = t
  .object({
    title: t.string(),
    text: t.string(),
    pattern: t.string(),
    type: cell.vocabType,
    restrict: cell.cardType.optional(),
    icon: cell.vocabIcon.optional()
  })
  .collectErrors()
export type Vocab = Infer<typeof VocabSchema>

export const VocabSheetSchema: ObjectType<{
  [keySignature]: typeof VocabSchema
}> = createRecordSchema(VocabSchema, t.string())
export type VocabSheetType = Infer<typeof VocabSheetSchema>
