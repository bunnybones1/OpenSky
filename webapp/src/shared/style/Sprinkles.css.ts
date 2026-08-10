import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'
import { mapValues } from 'lodash-es'

import { FONT_FAMILIES, FONT_SIZES, FONT_WEIGHTS } from './constants'
import { BREAKPOINTS } from './Theme'
import { ThemeVars } from './Theme.css'

const RESPONSIVE_PROPERTIES = defineProperties({
  conditions: mapValues(BREAKPOINTS, (bp) =>
    bp === 0 ? {} : { '@media': `screen and (min-width: ${bp}px)` }
  ),
  defaultCondition: 'base',
  properties: {
    position: ['absolute', 'relative', 'fixed', 'sticky'],
    display: [
      'none',
      'block',
      'inline',
      'grid',
      'inline-block',
      'flex',
      'inline-grid'
    ],
    alignItems: ['flex-start', 'center', 'flex-end'],
    justifyContent: [
      'flex-start',
      'center',
      'flex-end',
      'space-between',
      'space-around'
    ],
    flexDirection: ['row', 'row-reverse', 'column', 'column-reverse'],
    paddingTop: ThemeVars.spacing,
    paddingBottom: ThemeVars.spacing,
    paddingLeft: ThemeVars.spacing,
    paddingRight: ThemeVars.spacing,
    marginTop: ThemeVars.margins,
    marginBottom: ThemeVars.margins,
    marginLeft: ThemeVars.margins,
    marginRight: ThemeVars.margins,
    fontSize: FONT_SIZES,
    fontWeight: FONT_WEIGHTS
  },
  shorthands: {
    padding: ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'],
    paddingX: ['paddingLeft', 'paddingRight'],
    paddingY: ['paddingTop', 'paddingBottom'],
    margin: ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'],
    marginX: ['marginLeft', 'marginRight'],
    marginY: ['marginTop', 'marginBottom']
  }
})

const UN_RESPONSIVE_PROPERTIES = defineProperties({
  properties: {
    flexWrap: ['wrap', 'nowrap'],
    flexShrink: [0],
    flexGrow: [0, 1],
    flex: [1],
    width: { full: '100%', auto: 'auto' },
    height: { full: '100%', auto: 'auto' },
    cursor: ['pointer'],
    textTransform: ['uppercase', 'capitalize'],
    border: ['1px solid', '2px solid', '3px solid'],
    borderTop: ['1px solid', '2px solid', '3px solid'],
    borderBottom: ['1px solid', '2px solid', '3px solid'],
    borderLeft: ['1px solid', '2px solid', '3px solid'],
    borderRight: ['1px solid', '2px solid', '3px solid'],
    borderColor: ThemeVars.color,
    backgroundColor: ThemeVars.color,
    color: ThemeVars.color,
    fontFamily: FONT_FAMILIES,
    opacity: [0, 1],
    pointerEvents: ['none', 'auto', 'all'],
    overflow: ['hidden', 'auto', 'visible'],
    textAlign: ['left', 'center', 'right'],
    top: [0],
    left: [0],
    objectFit: ['contain', 'cover'],
    right: [0],
    bottom: [0],
    zIndex: [1, 2, 3, 4, 5]
  }
})

export const Sprinkles = createSprinkles(
  RESPONSIVE_PROPERTIES,
  UN_RESPONSIVE_PROPERTIES
)

export type SprinklesParams = Parameters<typeof Sprinkles>[0]
