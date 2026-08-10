import { globalStyle, style } from '@vanilla-extract/css'

import { GlobalFadeIn, GlobalPulse } from '~/shared/style/Animations.css'
import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const SubNavButtonStyle = style({
  selectors: {
    '&.isDisabled': {
      pointerEvents: 'none',
      cursor: 'not-allowed'
    }
  }
})

export const SubNavButtonTextStyle = style({
  textTransform: 'uppercase',
  transition: 'color 0.15s ease-out',
  letterSpacing: '1px',
  margin: '0px 3px',
  ...responsiveStyle({
    tabletWide: {
      margin: '0px 4px'
    }
  }),
  selectors: {
    [`${SubNavButtonStyle}:hover:not(:focused) &`]: {
      color: ThemeVars.color.white
    },
    [`${SubNavButtonStyle}.isActive &`]: {
      color: ThemeVars.color.white
    },
    [`${SubNavButtonStyle}.isDisabled &`]: {
      color: ThemeVars.color.purple6
    }
  }
})

export const SubNavActiveGlow = style({
  width: '80px',
  left: '50%',
  transform: 'translateX(-50%)',
  transition: 'opacity 0.15s ease-out',
  selectors: {
    [`${SubNavButtonStyle}.isActive &`]: {
      opacity: 1,
      height: '20px'
    },
    ['&:not(.isLoaded)']: {
      opacity: 0
    }
  }
})

export const SubNavActiveBG = style({
  background: `linear-gradient(
    180deg,
    rgba(94, 62, 185, 0) 48%,
    rgba(94, 62, 185, 0.45) 100%
  )`,
  selectors: {
    [`${SubNavButtonStyle}:hover:not(:focused) &`]: {
      opacity: 1
    },
    [`${SubNavButtonStyle}.isActive &`]: {
      opacity: 1
    }
  }
})

export const SubNavIcon = style({
  padding: '0px 2px',
  ...responsiveStyle({
    tabletWide: { padding: '0px 3px' }
  })
})

globalStyle(`${SubNavButtonStyle}:hover:not(:focused) .horizon-icon`, {
  fill: ThemeVars.color.white
})

globalStyle(`${SubNavButtonStyle}.isActive .horizon-icon`, {
  fill: ThemeVars.color.white
})

globalStyle(`${SubNavButtonStyle}.isDisabled .horizon-icon`, {
  fill: ThemeVars.color.purple6
})

export const SubNavButtonUnreadBadge = style({
  height: '18px',
  width: '18px',
  top: '4px',
  right: '4px',
  borderRadius: '50%',
  zIndex: 99999,
  selectors: {
    [`${SubNavButtonStyle}.isActive &`]: {
      display: 'none'
    }
  }
})

export const SubNavPulse = style({
  zIndex: 99,
  borderRadius: '20px',
  left: '50%',
  bottom: '-12px',
  transform: 'translateX(-50%)',
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
    [`${SubNavButtonStyle}.isActive &`]: {
      display: 'none'
    }
  }
})
