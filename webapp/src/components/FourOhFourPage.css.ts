import { style } from '@vanilla-extract/css'

import { TOP_OFFSET_KEY } from '~/shared/style/constants'
import { responsiveStyle } from '~/shared/style/Theme'

export const FourOhFourPageStyle = style({
  paddingTop: '32px',
  ...responsiveStyle({
    mobile: { paddingTop: '30px' },
    tablet: { paddingTop: '40px' },
    tabletWide: { paddingTop: `calc(var(${TOP_OFFSET_KEY}) + 60px)` }
  })
})
