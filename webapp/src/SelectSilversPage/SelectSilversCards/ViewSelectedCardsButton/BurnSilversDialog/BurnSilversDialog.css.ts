import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const BurnSilversDialogStyle = style({
  height: ThemeVars.sizes.dialogMaxHeight,
  width: ThemeVars.sizes.dialogMaxWidth,
  ...responsiveStyle({
    tabletWide: {
      height: '540px',
      width: '900px'
    }
  })
})

export const Wrapper = style({
  height: '52px',
  ...responsiveStyle({
    tabletWide: {
      height: '80px'
    }
  })
})

export const BackButton = style({
  left: '8px'
})
