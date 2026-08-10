import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT, NAVBAR_WIDTH } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

export const AuthenticatedPageLoaderStyle = style({
  zIndex: 99
})

export const AuthenticatedPageLoaderNavBar = style({
  height: '100%',
  width: `${NAVBAR_WIDTH}px`,
  gridTemplateRows: '1fr 44px',
  ...responsiveStyle({
    tabletWide: {
      height: `${NAVBAR_HEIGHT}px`,
      width: '100%',
      gridTemplateColumns: '1fr 91px',
      gridTemplateRows: 'unset'
    }
  })
})
