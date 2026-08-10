import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const SkypassPurchasePageBackButton = style({
  width: '75px',
  ...responsiveStyle({
    tabletWide: {
      width: '102px'
    }
  })
})

export const SkyPassPurchasePageStyle = style({
  backgroundSize: 'cover!important',
  backgroundRepeat: 'no-repeat'
})

export const SkyPassPurchasePageInner = style({
  columnGap: '32px',
  overflowX: 'hidden',
  overflowY: 'auto',
  ...responsiveStyle({
    tablet: {
      columnGap: '52px'
    },
    tabletWide: {
      columnGap: '100px'
    }
  })
})
