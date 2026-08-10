import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

export const FeatureBgStyle = style({
  transition: 'opacity 0.2s ease-out',
  objectFit: 'cover',
  left: '50%',
  transform: 'translateX(-50%)'
})

export const StickerFeatureStyle = style({
  height: '100vh',
  ...responsiveStyle({
    tabletWide: {
      height: `calc(100vh - ${NAVBAR_HEIGHT}px)`
    }
  })
})

export const StickerFeatureSticker = style({
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '260px',
  ...responsiveStyle({
    tabletWide: {
      width: '360px'
    }
  })
})
