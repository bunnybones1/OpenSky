import t, { Infer, ObjectType, keySignature } from 'myzod'

import * as cell from '../cellTypes'
import { createRecordSchema } from '../record'

export const CrystalSchema = t
  .object({
    artSlug: cell.crystalArtSlug,
    name: t.string(),
    flavorText: t.string(),
    color: cell.hexColor
  })
  .collectErrors()
export type Crystal = Infer<typeof CrystalSchema>

export const CrystalsSheetSchema: ObjectType<{
  [keySignature]: typeof CrystalSchema
}> = createRecordSchema(CrystalSchema, cell.crystalID)
