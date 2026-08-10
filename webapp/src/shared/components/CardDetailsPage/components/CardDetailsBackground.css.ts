import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

export const CardDetailsBackgroundStyle = style({
  zIndex: -2,
  height: '100vh',
  ...responsiveStyle({
    tabletWide: {
      height: `calc(100vh - ${NAVBAR_HEIGHT}px)`
    }
  })
})

export const ImageWrapper = style({
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  width: '55%',
  paddingTop: '5%',
  backgroundRepeat: 'no-repeat',
  selectors: {
    '&.isSpell': {
      width: '46%'
    }
  }
})

export const UnitImage = style({
  opacity: 0,
  transition: 'opacity 0.2s ease-out',
  selectors: {
    '&.isLoaded': { opacity: 1 }
  }
})
