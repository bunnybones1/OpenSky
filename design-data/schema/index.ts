import t, { Infer, ValidationError, keySignature } from 'myzod'

import { ArtSheetSchema } from './art'
import { CardsSheetSchema } from './card'
import { CardBacksSheetSchema } from './cardback'
import * as cell from './cellTypes'
import { CrystalsSheetSchema } from './crystal'
import { HeroSkinsSheetSchema } from './heroskin'
import { QuestsSheetSchema } from './quest'
import { VocabSheetSchema } from './vocab'

function allCardArtIsValid({ cards, art }: SheetsDataType) {
  const cardErrors: Record<string, ValidationError> = {}
  for (const [cardID, card] of Object.entries(cards)) {
    const refArt = art[card.artSlug]
    if (!refArt) {
      cardErrors[cardID] = new ValidationError(
        `${card.name} references art ${card.artSlug}, but no art with that slug exists.`,
        [cardID, 'artSlug']
      )
    } else if (refArt.element && refArt.element !== card.element) {
      cardErrors[cardID] = new ValidationError(
        `${card.name} references art ${card.artSlug}, but the art has element ${refArt.element} not matching the card element ${card.element}.`,
        [cardID, 'element']
      )
    }
  }
  if (Object.keys(cardErrors).length > 0) {
    throw new ValidationError(
      'Error validating Cards against Art',
      ['cards'],
      cardErrors
    )
  }
  return true
}
export const SheetsSchema = t
  .object({
    cards: CardsSheetSchema,
    art: ArtSheetSchema,
    vocab: VocabSheetSchema,
    quests: QuestsSheetSchema,
    crystals: CrystalsSheetSchema,
    heroSkins: HeroSkinsSheetSchema,
    cardBacks: CardBacksSheetSchema
  })
  .collectErrors()
  .withPredicate(allCardArtIsValid)
export type SheetsDataType = Infer<typeof SheetsSchema>

export type SheetRow = SheetsDataType[keyof SheetsDataType][string]
export type KeysOfUnion<T> = T extends T ? keyof T : never
export type SheetRowKey = KeysOfUnion<SheetRow>

export const sheetRowKeys: SheetRowKey[] = Object.values(
  SheetsSchema.shape()
).flatMap(s => Object.keys(s.shape()[keySignature].shape()) as SheetRowKey[])

export const GlobalDataSchema = t
  .object({
    sheets: SheetsSchema,
    assetsHash: cell.assetsHash
  })
  .collectErrors()

export type GlobalDataType = Infer<typeof GlobalDataSchema>

export * from './art'
export * from './card'
export * from './cardback'
export * from './crystal'
export * from './heroskin'
export * from './quest'
export * from './vocab'
