import { style, styleVariants } from '@vanilla-extract/css'

import {
  backgroundColorVar,
  borderColorVar,
  filterVar
} from '~/shared/style/SharedButtonStyles.css'
import { ThemeVars } from '~/shared/style/Theme.css'

export const BaseSelectStyle = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  position: 'relative',
  pointerEvents: 'all',
  userSelect: 'none',
  height: '36px',
  background: backgroundColorVar,
  filter: filterVar,
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  padding: '8px 12px',
  border: `1px solid ${borderColorVar}`,
  borderRadius: '4px',
  selectors: {
    '&:disabled': {
      cursor: 'not-allowed',
      vars: {
        [borderColorVar]: ThemeVars.color.purple6,
        [backgroundColorVar]: ThemeVars.color.purple3
      }
    },
    '&.isFullWidth': {
      width: '100%'
    }
  }
})

export const SelectOptionsWrapper = style({
  display: 'grid',
  gridAutoFlow: 'row',
  borderWidth: '1px',
  borderStyle: 'solid',
  filter: `drop-shadow(0px 0px 10px ${ThemeVars.color.black})`,
  zIndex: 10
})

export const OptionsWrapperBorderVariants = styleVariants({
  default: { borderColor: ThemeVars.color.purple9 },
  secondary: { borderColor: ThemeVars.color.purple9 },
  blue: { borderColor: ThemeVars.color.cold7 },
  green: { borderColor: ThemeVars.color.forest7 },
  orange: { borderColor: ThemeVars.color.warm7 },
  red: { borderColor: ThemeVars.color.pink7 }
})

export const TitleStyle = styleVariants({
  default: { color: ThemeVars.color.purple8 },
  secondary: { color: ThemeVars.color.purple9 },
  blue: { color: ThemeVars.color.cold8 },
  green: { color: ThemeVars.color.forest7 },
  orange: { color: ThemeVars.color.warm2 },
  red: { color: ThemeVars.color.pink6 }
})
