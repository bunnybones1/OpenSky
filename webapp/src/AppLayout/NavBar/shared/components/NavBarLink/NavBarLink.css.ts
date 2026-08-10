import { style } from '@vanilla-extract/css'

import { GlobalFadeIn, GlobalPulse } from '~/shared/style/Animations.css'
import { ThemeVars } from '~/shared/style/Theme.css'

export const NavBarLinkStyle = style({
  width: '100%',
  height: '46px',
  background: ThemeVars.color.purple4,
  transition: 'background 0.2s ease-out',
  selectors: {
    '&.isHorizontal': {
      width: '60px',
      height: '100%'
    },
    '&.isActive': {
      background: ThemeVars.color.purple5
    }
  }
})

export const NavBarTextStyle = style({
  transition: 'color 0.2s ease-out',
  selectors: {
    [`${NavBarLinkStyle}.isActive &`]: {
      color: ThemeVars.color.white
    }
  }
})

export const NavBarHighlightStyle = style({
  transition: 'opacity 0.2s ease-out',
  zIndex: 2,
  width: 'auto',
  height: '146%',
  right: 0,
  top: '50%',
  bottom: 'unset',
  left: 'unset',
  transform: 'translateY(-50%)',
  '@media': {
    '(hover)': {
      selectors: {
        [`${NavBarLinkStyle}:hover &`]: {
          opacity: 1
        }
      }
    }
  },
  selectors: {
    ['&:not(.isLoaded)']: {
      opacity: '0!important'
    },
    [`${NavBarLinkStyle}.isActive &`]: {
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

export const NavBarLinkUnreadBadge = style({
  right: 0,
  top: 0,
  selectors: {
    '&.isHorizontal': {
      top: '0px',
      right: '8px'
    }
  }
})

export const NavBarLinkPulse = style({
  zIndex: 99,
  borderRadius: '20px',
  right: '-30px',
  top: '50%',
  transform: 'translateY(-50%)',
  minWidth: '28px',
  border: `3px solid ${ThemeVars.color.black}`,
  animation: `${GlobalFadeIn} 0.25s ease-out 1`,
  '::before': {
    content: '',
    position: 'absolute',
    top: '-4px',
    left: '-4px',
    right: '-4px',
    bottom: '-4px',
    border: `3px solid ${ThemeVars.color.warm6}`,
    borderRadius: '20px',
    zIndex: -1,
    animation: `${GlobalPulse} 0.75s ease-out infinite`
  },
  selectors: {
    '&.isHorizontal': {
      right: 'auto',
      left: '50%',
      transform: 'translateX(-50%)',
      top: 'auto',
      bottom: '-12px'
    }
  }
})
