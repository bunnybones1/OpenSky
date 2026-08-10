import { style } from '@vanilla-extract/css'

import { DISCLAIMER_HEIGHT, NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

export const DeckViewerStyle = style({
  zIndex: 17,
  width: '300px',
  height: '100vh',
  top: 0,
  ...responsiveStyle({
    tabletWide: {
      top: `${NAVBAR_HEIGHT}px`,
      height: `calc(100vh - ${NAVBAR_HEIGHT}px)`
    }
  }),
  selectors: {
    '&.hasBannerMargin': {
      ...responsiveStyle({
        tabletWide: {
          top: `${DISCLAIMER_HEIGHT}px`,
          height: `calc(100% - ${DISCLAIMER_HEIGHT}px)`
        }
      })
    }
  }
})

export const DeckViewerHeaderCloseButton = style({ zIndex: 5, width: '42px' })
