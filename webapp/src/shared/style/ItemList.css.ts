import { style } from '@vanilla-extract/css'
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'
import { mapValues } from 'lodash-es'

import { BREAKPOINTS } from './Theme'
import { ThemeVars } from './Theme.css'

export const GridTemplateColumns = {
  one: 'repeat(1, 1fr)',
  two: 'repeat(2, 1fr)',
  three: 'repeat(3, 1fr)',
  four: 'repeat(4, 1fr)',
  five: 'repeat(5, 1fr)',
  six: 'repeat(6, 1fr)',
  seven: 'repeat(7, 1fr)',
  eight: 'repeat(8, 1fr)'
}

export const ItemListStyle = style({
  width: '100%',
  display: 'grid',
  height: 'auto'
})

export const ItemListProperties = defineProperties({
  conditions: mapValues(BREAKPOINTS, (bp) =>
    bp === 0 ? {} : { '@media': `screen and (min-width: ${bp}px)` }
  ),
  defaultCondition: 'base',
  properties: {
    gridTemplateColumns: GridTemplateColumns,
    rowGap: ThemeVars.spacing,
    columnGap: ThemeVars.spacing
  }
})

export const ItemListSprinkles = createSprinkles(ItemListProperties)

export type ItemListSprinklesParams = Parameters<typeof ItemListSprinkles>[0]
