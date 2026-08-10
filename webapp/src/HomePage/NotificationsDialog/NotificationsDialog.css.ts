import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const NotificationsDialogStyle = style({
  height: ThemeVars.sizes.dialogMaxHeight,
  width: ThemeVars.sizes.dialogMaxWidth,
  ...responsiveStyle({
    tabletWide: {
      height: '500px',
      width: '900px'
    },
    desktop: {
      height: '700px',
      width: '1400px'
    }
  })
})
