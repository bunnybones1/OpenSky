import { createGlobalTheme } from '@vanilla-extract/css'
import { calc } from '@vanilla-extract/css-utils'

import {
  BUTTON_BACKGROUNDS,
  BUTTON_FILTERS,
  BUTTON_HOVER_BACKGROUNDS,
  THEME_COLORS,
  THEME_SPACING
} from './Theme'

type Space = keyof typeof THEME_SPACING
type NegativeSpace = `-${Exclude<
  Space,
  '0px' | '32px' | '36px' | '48px' | '60px' | '96px' | '120px'
>}`

const NEGATIVE_SPACE: { [key in NegativeSpace]: string } = {
  '-4px': `${calc(THEME_SPACING['4px']).negate()}`,
  '-8px': `${calc(THEME_SPACING['8px']).negate()}`,
  '-12px': `${calc(THEME_SPACING['12px']).negate()}`,
  '-16px': `${calc(THEME_SPACING['16px']).negate()}`,
  '-20px': `${calc(THEME_SPACING['20px']).negate()}`,
  '-24px': `${calc(THEME_SPACING['24px']).negate()}`
}

const MARGINS = {
  ...THEME_SPACING,
  ...NEGATIVE_SPACE,
  auto: 'auto'
}

export const ThemeVars = createGlobalTheme(':root', {
  color: THEME_COLORS,
  spacing: THEME_SPACING,
  margins: MARGINS,
  sizes: {
    dialogMaxHeight: 'calc(100dvh - 20px)',
    dialogMaxWidth: 'calc(100dvw - 20px)'
  },
  buttons: {
    backgrounds: BUTTON_BACKGROUNDS,
    hoverBackgrounds: BUTTON_HOVER_BACKGROUNDS,
    filters: BUTTON_FILTERS
  }
})
