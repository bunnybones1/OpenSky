import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

export const FeatureBgStyle = style({
  transition: 'opacity 0.2s ease-out',
  objectFit: 'cover',
  left: '50%',
  transform: 'translateX(-50%)'
})

export const CardBackFeatureStyle = style({
  height: '100vh',
  ...responsiveStyle({
    tabletWide: {
      height: `calc(100vh - ${NAVBAR_HEIGHT}px)`
    }
  })
})

export const CardBackFeatureCardBack = style({
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)'
})

export const CardBackImage = style({
  opacity: 1,
  transition: 'opacity 0.2s ease-out',
  height: '80vh',
  ...responsiveStyle({
    tabletWide: {
      height: `calc(80vh - ${NAVBAR_HEIGHT}px)`
    }
  }),
  selectors: {
    '&.isLocked': {
      opacity: 0.65
    },
    [`${CardBackFeatureCardBack}:hover &`]: {
      opacity: 1
    }
  }
})

export const LockStyle = style({
  opacity: 1,
  transition: 'opacity 0.125s ease-in-out',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  selectors: {
    [`${CardBackFeatureCardBack}:hover &`]: {
      opacity: 0
    }
  }
})
