import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const PrismButtonStyle = style({
  width: '82.1px',
  selectors: {
    '&.isLocked': {
      pointerEvents: 'none'
    }
  },
  ...responsiveStyle({
    tablet: {
      width: '114px'
    },
    desktop: {
      width: '170px'
    }
  })
})

export const PrismButtonInner = style({
  paddingTop: `${(69 / 82) * 100}%`
})

export const PrismButtonImageWrapper = style({
  width: `${(96 / 114) * 100}%`
})

export const PrismButtonImage = style({
  opacity: 0.25,
  selectors: {
    '&.isUnlocked': {
      opacity: 1
    }
  }
})

export const PrismButtonFlare = style({
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: -2,
  width: '1px',
  background: `linear-gradient(to bottom, rgba(77, 60, 123, 0), ${ThemeVars.color.purple6})`,
  bottom: '18px',
  height: '116px',
  ...responsiveStyle({
    tablet: {
      bottom: '27px',
      height: '160px'
    },
    desktop: {
      bottom: '42px',
      height: '259px'
    }
  })
})

export const PrismButtonLock = style({
  bottom: '10px',
  width: '130%',
  left: '50%',
  transform: 'translateX(-50%)',
  ...responsiveStyle({
    tablet: {
      bottom: '20px'
    },
    desktop: {
      bottom: '36px'
    }
  })
})

export const PrismButtonBackground = style({
  bottom: '18px',
  transform: 'translateX(-50%)',
  transition: 'opacity 0.3s',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'bottom',
  backgroundSize: 'contain',
  height: '18px',
  left: '50%',
  ...responsiveStyle({
    tablet: {
      height: '20px',
      bottom: '27px'
    },
    desktop: {
      height: '32px',
      bottom: '42px'
    }
  })
})
