import { BaseCard } from '@skyweaver/state-metadata'

import { getCardCache } from '~/cardCache'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'

import { PaletteName } from './meshAnimationHelpers'

export const titanSummonPaletteMap: Map<BaseCard, PaletteName> = new Map()
titanSummonPaletteMap.set('155', 'metal2')
titanSummonPaletteMap.set('1153', 'fire_mane')
titanSummonPaletteMap.set('2138', 'hex')
titanSummonPaletteMap.set('3147', 'hex')
titanSummonPaletteMap.set('4142', 'water_mane')

export function isTitan(card: Readonly<RelaxedCardInstance>) {
  const instance = getCardCache().getInstance(card)
  return (
    instance &&
    (instance.base === '155' ||
      instance.base === '1153' ||
      instance.base === '2138' ||
      instance.base === '3147' ||
      instance.base === '4142')
  )
}

// '25013','Vengeance

export function isMercurial(card: Readonly<RelaxedCardInstance>) {
  const instance = getCardCache().getInstance(card)
  return (
    instance &&
    (instance.base === '25014' ||
      instance.base === '25015' ||
      instance.base === '25016' ||
      instance.base === '25017' ||
      instance.base === '25018' ||
      instance.base === '25019' ||
      instance.base === '25020' ||
      instance.base === '25021' ||
      instance.base === '25022')
  )
}
