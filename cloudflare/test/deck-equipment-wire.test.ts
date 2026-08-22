import { describe, expect, it } from 'vitest'

import { sourceDeckEquipmentWire } from '../src/deck-equipment-wire'

describe('source deck-equipment wire compatibility', () => {
  it('projects every generated field and drops repository metadata', () => {
    expect(
      sourceDeckEquipmentWire({
        stickers: [5, 9],
        heroSkin: 1,
        cardBack: 7,
        internalOnly: 'must not leak'
      } as never)
    ).toEqual({ stickers: [5, 9], heroSkin: 1, cardBack: 7 })
  })

  it('preserves nil slice and pointer fields as explicit nulls', () => {
    expect(sourceDeckEquipmentWire({})).toEqual({
      stickers: null,
      heroSkin: null,
      cardBack: null
    })
    expect(sourceDeckEquipmentWire({ stickers: [] })).toEqual({
      stickers: null,
      heroSkin: null,
      cardBack: null
    })
    expect(
      sourceDeckEquipmentWire({ stickers: null, heroSkin: 0, cardBack: 0 })
    ).toEqual({ stickers: null, heroSkin: 0, cardBack: 0 })
  })
})
