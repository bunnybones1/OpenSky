import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const RenameBurnerAccountDialogStyle = style({
  maxHeight: ThemeVars.sizes.dialogMaxHeight,
  maxWidth: ThemeVars.sizes.dialogMaxWidth
})

export const BannerImage = style({
  height: '80px',
  ...responsiveStyle({
    tablet: {
      height: '150px'
    }
  })
})
