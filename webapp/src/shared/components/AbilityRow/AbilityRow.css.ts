import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const AbilityRowWrapper = style({
  padding: '2px 0px',
  height: '36px',
  ...responsiveStyle({
    tablet: {
      height: '42px'
    },
    tabletWide: {
      height: '48px',
      padding: '4px 0px'
    }
  }),
  selectors: {
    '&.isLocked': {
      opacity: 0.4
    }
  }
})

export const ManaIconWrapper = style({
  top: '50%',
  transform: 'translateY(-50%)',
  right: 'auto',
  height: '28px',
  width: '28px',
  ...responsiveStyle({
    tabletWide: {
      height: '32px',
      width: '32px'
    }
  })
})

export const ManaIconImage = style({
  zIndex: 5
})

export const ManaIconText = style({
  top: '50%',
  left: '50%',
  zIndex: 6,
  transform: 'translate(-50%, calc(-50% - 1px))'
})

export const CardNameWrapper = style({
  left: '32px',
  top: '50%',
  transform: 'translateY(-50%)',
  ...responsiveStyle({
    tablet: {
      left: '40px'
    }
  })
})

export const AbilityRowBorder = style({
  transition: 'box-shadow 0.2s ease-in',
  borderRadius: '50px',
  boxShadow: '0 0 0 1px #0C061E, 0 0 0 2px #4C607B, 0 0 0 3px #0C061E',
  selectors: {
    '&:hover': {
      boxShadow: '0 0 0 1px #0C061E, 0 0 0 2px #C5B4F5, 0 0 0 3px #0C061E'
    }
  }
})

export const AbilityRowGradeOverlay = style({
  background: `linear-gradient(
    90deg,
    #231445 0%,
    rgba(35, 20, 69, 0.5) 50%,
    rgba(12, 6, 30, 0) 67.72%,
    rgba(35, 20, 69, 0.5) 79.29%,
    #231445 100%
  )`
})

export const AbilityRowImage = style({
  top: '-8px'
})
