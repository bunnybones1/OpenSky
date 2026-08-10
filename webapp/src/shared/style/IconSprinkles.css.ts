import { style } from '@vanilla-extract/css'
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'
import mapValues from 'lodash-es/mapValues'

export const IconStyle = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center'
})

import { BREAKPOINTS } from './Theme'

const IconSizes = {
  '10px': '10px',
  '12px': '12px',
  '14px': '14px',
  '16px': '16px',
  '20px': '20px',
  '24px': '24px',
  '32px': '32px',
  '48px': '48px',
  '96px': '96px'
}

export type IconSize = keyof typeof IconSizes

const ResponsiveIconProperties = defineProperties({
  conditions: mapValues(BREAKPOINTS, (bp) =>
    bp === 0 ? {} : { '@media': `screen and (min-width: ${bp}px)` }
  ),
  defaultCondition: 'base',
  properties: {
    height: IconSizes
  }
})

export const IconSprinkles = createSprinkles(ResponsiveIconProperties)

export type IconSprinklesParams = Parameters<typeof IconSprinkles>[0]
