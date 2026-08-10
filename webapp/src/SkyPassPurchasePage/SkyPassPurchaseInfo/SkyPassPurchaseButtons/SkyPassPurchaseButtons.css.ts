import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const SkyPassPurchaseButtonsStyle = style({
  width: '130px',
  rowGap: '16px',
  marginTop: '16px',
  ...responsiveStyle({
    tablet: {
      marginTop: '30px',
      rowGap: '24px',
      width: '187px'
    }
  })
})
