import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const CardCraftingDialogBalanceStyle = style({
  bottom: '-30px!important',
  ...responsiveStyle({
    tabletWide: {
      bottom: '-40px!important'
    }
  })
})
