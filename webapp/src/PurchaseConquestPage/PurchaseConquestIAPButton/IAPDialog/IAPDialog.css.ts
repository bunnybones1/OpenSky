import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const IAPDialogStyle = style({
  width: ThemeVars.sizes.dialogMaxWidth,
  height: ThemeVars.sizes.dialogMaxHeight,
  ...responsiveStyle({
    tablet: {
      height: '540px',
      width: '900px'
    }
  })
})

export const IAPDialogHeader = style({
  height: '44px',
  paddingLeft: '88px',
  paddingRight: '24px',
  ...responsiveStyle({
    tabletWide: {
      height: '64px',
      paddingLeft: '24px',
      paddingRight: '58px'
    }
  })
})

export const IAPDialogTotalRow = style({
  height: '36px',
  ...responsiveStyle({
    tablet: { height: '48px' }
  })
})

export const IAPDialogControlsRow = style({
  height: '64px'
})

export const IAPDialogSubmitButtonWrapper = style({
  width: '160px'
})
