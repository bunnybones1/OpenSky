import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const PlayLinkWrapperStyle = style({
  width: '100%',
  height: '44px',
  marginTop: 'auto',
  selectors: {
    '&.isHorizontal': {
      width: '91px',
      marginTop: 'unset',
      height: '100%'
    }
  }
})

export const PlayLinkStyle = style({
  width: 'calc(100% + 1px)',
  height: '100%',
  background: 'linear-gradient(180deg, #3EB06B 46.09%, #309D5B 46.78%)',
  borderColor: '#86FBB4',
  selectors: {
    '&.isHorizontal': {
      width: '100%',
      height: 'calc(100% + 1px)'
    },
    '&.isActive:not(.isHorizontal)': {
      background: ThemeVars.color.purple5,
      borderRightColor: ThemeVars.color.purple7,
      borderTopColor: ThemeVars.color.purple5
    },
    '&.isHorizontal.isActive': {
      background: ThemeVars.color.purple5,
      borderBottomColor: ThemeVars.color.purple7,
      borderLeftColor: ThemeVars.color.purple5
    }
  }
})

export const PlayLinkTextStyle = style({
  transition: 'color 0.2s ease-out',
  selectors: {
    [`${PlayLinkStyle}.isActive &`]: {
      color: ThemeVars.color.white
    }
  }
})

export const PlayLinkHighlightStyle = style({
  transition: 'opacity 0.2s ease-out',
  zIndex: 2,
  width: 'auto',
  height: '146%',
  right: 0,
  top: '50%',
  bottom: 'unset',
  left: 'unset',
  transform: 'translateY(-50%)',
  selectors: {
    ['&:not(.isLoaded)']: {
      opacity: '0!important'
    },
    [`${PlayLinkStyle}:hover &`]: {
      opacity: 1
    },
    [`${PlayLinkStyle}.isActive &`]: {
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
