import { style } from '@vanilla-extract/css'

import {
  backgroundColorVar,
  borderColorVar,
  filterVar,
  toggleClassName
} from '~/shared/style/SharedButtonStyles.css'

import { ThemeVars } from '../style/Theme.css'

export const BaseToggleButton = style({
  background: backgroundColorVar,
  borderColor: borderColorVar,
  filter: filterVar,
  transition: 'all 0.2s ease-in-out',
  padding: '8px 12px',
  borderTopWidth: '1px',
  borderBottomWidth: '1px',
  borderStyle: 'solid',
  borderLeftWidth: '1px',
  selectors: {
    ['&.isFirst']: {
      borderTopLeftRadius: '4px',
      borderBottomLeftRadius: '4px'
    },
    ['&.isLast']: {
      borderRightWidth: '1px',
      borderTopRightRadius: '4px',
      borderBottomRightRadius: '4px'
    },
    '&:disabled': {
      cursor: 'not-allowed',
      vars: {
        [borderColorVar]: ThemeVars.color.purple6,
        [backgroundColorVar]: ThemeVars.color.purple3
      }
    },
    // Hover States
    [`&:not(:disabled).default:hover + &`]: {
      borderLeftColor: ThemeVars.color.purple9
    },
    [`&:not(:disabled).secondary:hover + &`]: {
      borderLeftColor: ThemeVars.color.purple9
    },
    [`&:not(:disabled).blue:hover + &`]: {
      borderLeftColor: ThemeVars.color.cold7
    },
    [`&:not(:disabled).green:hover + &`]: {
      borderLeftColor: ThemeVars.color.forest6
    },
    [`&:not(:disabled).orange:hover + &`]: {
      borderLeftColor: ThemeVars.color.warm7
    },
    [`&:not(:disabled).red:hover + &`]: {
      borderLeftColor: ThemeVars.color.pink7
    },
    // Active States
    [`&:not(:disabled).default.${toggleClassName} + &`]: {
      borderLeftColor: ThemeVars.color.purple9
    },
    [`&:not(:disabled).secondary.${toggleClassName} + &`]: {
      borderLeftColor: ThemeVars.color.purple9
    },
    [`&:not(:disabled).blue.${toggleClassName} + &`]: {
      borderLeftColor: ThemeVars.color.cold7
    },
    [`&:not(:disabled).green.${toggleClassName} + &`]: {
      borderLeftColor: ThemeVars.color.forest6
    },
    [`&:not(:disabled).orange.${toggleClassName} + &`]: {
      borderLeftColor: ThemeVars.color.warm7
    },
    [`&:not(:disabled).red.${toggleClassName} + &`]: {
      borderLeftColor: ThemeVars.color.pink7
    }
  }
})

export const ToggleButtonUnreadBadge = style({
  height: '18px',
  width: '18px',
  top: '-4px',
  right: '-4px',
  borderRadius: '50%',
  zIndex: 99999
})
