import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const SelectGoldsBannerStyle = style({
  height: '44px',
  ...responsiveStyle({
    tabletWide: {
      height: '80px'
    }
  })
})

export const BackButton = style({
  width: '52px',
  ...responsiveStyle({
    tablet: {
      width: '80px'
    }
  })
})
