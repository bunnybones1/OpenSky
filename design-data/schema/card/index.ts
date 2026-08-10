import { Infer, ObjectType, keySignature } from 'myzod'

import * as cell from '../cellTypes'
import { createRecordSchema } from '../record'
import * as s from './sheetValidate'
import { _bareCardSchema } from './single/struct'
import * as c from './single/validate'

export const CardSchema = _bareCardSchema
  .withPredicate(c.onlyHeroAbilitiesHaveChargesCountersAndPerTurn)
  .withPredicate(c.artSlugTypeMatchesCardType)
  .withPredicate(c.onlyUnitsHavePowerAndHealth)
  .withPredicate(c.onlyUnitsHaveAttachments)
  .withPredicate(c.elementMatchesCardType)

export const CardsSheetSchema: ObjectType<{
  [keySignature]: typeof CardSchema
}> = createRecordSchema(CardSchema, cell.cardID)
  .withPredicate(s.allCardDescriptionsParseWithCardReferences)
  .withPredicate(s.allCardIdsMatchPrisms)
export type CardsSheetType = Infer<typeof CardsSheetSchema>
export type Card = Infer<typeof CardSchema>

export const cardPropsThatCanBeChangedWithoutCausingPatchNotesSection: Array<
  keyof Card
> = ['notes', 'rarity', 'releaseSeason', 'textLastImplementedAsCode']
