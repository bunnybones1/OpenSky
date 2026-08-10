import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const PurchaseWithUSDCDialogStyle = style({
  height: ThemeVars.sizes.dialogMaxHeight,
  width: ThemeVars.sizes.dialogMaxWidth,
  ...responsiveStyle({
    tabletWide: {
      height: '540px',
      width: '900px'
    }
  })
})

export const PurchaseWithUSDCDialogHeader = style({
  height: '64px',
  ...responsiveStyle({
    tabletWide: {
      height: '84px'
    }
  })
})

export const PurchaseWithUSDCDialogTooltip = style({
  gridTemplateColumns: '1fr',
  columnGap: '10px'
})

export const PurchaseWithUSDCDialogArrow = style({
  transform: 'rotate(-180deg) translateY(-16px)'
})
