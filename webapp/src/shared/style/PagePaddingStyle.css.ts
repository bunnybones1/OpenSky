import { style } from '@vanilla-extract/css'

import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

import { TOP_OFFSET_KEY } from './constants'

export const PagePaddingStyle = style({
  paddingLeft: `${NAVBAR_WIDTH}px`,
  paddingTop: '0px',
  ...responsiveStyle({
    tabletWide: {
      paddingLeft: '0px',
      paddingTop: `calc(var(${TOP_OFFSET_KEY}) - 8px)`
    }
  })
})
