import { Infer, ObjectType, keySignature } from 'myzod'

import * as cell from '../cellTypes'
import { createRecordSchema } from '../record'
import { onlyUnitsHaveBackgrounds } from './sheetValidate'
import { _bareArtSchema } from './single/struct'
import { artElementMatchesBackgroundId } from './single/validate'

export const ArtSchema = _bareArtSchema.withPredicate(
  artElementMatchesBackgroundId
)
export type Art = Infer<typeof ArtSchema>

export const ArtSheetSchema: ObjectType<{
  [keySignature]: typeof ArtSchema
}> = createRecordSchema(ArtSchema, cell.artSlug).withPredicate(
  onlyUnitsHaveBackgrounds
)
export type ArtSheetType = Infer<typeof ArtSheetSchema>
