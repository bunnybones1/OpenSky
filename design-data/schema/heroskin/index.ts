import t, { Infer, ObjectType, keySignature } from 'myzod'

import * as cell from '../cellTypes'
import { createRecordSchema } from '../record'

export const HeroSkinSchema = t
  .object({
    name: t.string(),
    hero: cell.hero,
    artSlug: t.string({
      pattern: /^hero-[a-z]+-\d\d$/
    }),
    grade: cell.itemGrade,
    flavorText: t.string()
  })
  .collectErrors()
export type HeroSkin = Infer<typeof HeroSkinSchema>

export const HeroSkinsSheetSchema: ObjectType<{
  [keySignature]: typeof HeroSkinSchema
}> = createRecordSchema(HeroSkinSchema, cell.heroSkinID)
