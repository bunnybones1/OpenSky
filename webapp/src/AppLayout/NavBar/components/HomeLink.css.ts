import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const HomeLinkStyle = style({
  backgroundColor: ThemeVars.color.purple4,
  maxWidth: '212px',
  borderColor: ThemeVars.color.purple4,
  transition: '0.2s ease-out',
  selectors: {
    '&.isActive': {
      backgroundColor: ThemeVars.color.purple5,
      borderColor: ThemeVars.color.purple7
    }
  }
})

export const HomeLinkHighlight = style({
  transition: 'opacity 0.2s ease-out',
  zIndex: 2,
  width: '80%',
  height: 'auto',
  bottom: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  selectors: {
    ['&:not(.isLoaded)']: {
      opacity: '0!important'
    },
    [`${HomeLinkStyle}:hover &`]: {
      opacity: 1
    },
    [`${HomeLinkStyle}.isActive &`]: {
      opacity: 1
    },
    '&.isHorizontal': {
      width: '146%',
      height: 'auto',
      bottom: 0,
      right: 'unset',
      top: 'unset',
      left: '50%',
      transform: 'translateX(-50%)'
    }
  }
})

export const HomeLinkBetaBlock = style({ padding: '1px 2px', lineHeight: 1 })
