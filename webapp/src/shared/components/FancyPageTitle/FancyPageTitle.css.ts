import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const FancyPageTitleContainer = style({
  left: '50px',
  ...responsiveStyle({
    mobile: {
      left: '70px'
    },
    tabletWide: {
      left: '90px'
    }
  })
})

export const FancyPageTitleBackImg = style({
  top: '2px',
  left: '-120px',
  ...responsiveStyle({
    tablet: {
      left: '-90px'
    },
    tabletWide: {
      left: '-20px'
    }
  })
})
