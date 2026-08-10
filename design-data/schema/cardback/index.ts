import t, { Infer, ObjectType, keySignature } from 'myzod'

import * as cell from '../cellTypes'
import { createRecordSchema } from '../record'

export const CardBackSchema = t
  .object({
    name: t.string(),
    artSlug: t.string({
      pattern: /^cardback-[a-z]+-\d\d$/
    }),
    flavorText: t.string()
  })
  .collectErrors()
export type CardBack = Infer<typeof CardBackSchema>

export const CardBacksSheetSchema: ObjectType<{
  [keySignature]: typeof CardBackSchema
}> = createRecordSchema(CardBackSchema, cell.cardBackID)
