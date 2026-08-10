import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const AccountSettingsDialogStyle = style({
  height: ThemeVars.sizes.dialogMaxHeight,
  width: ThemeVars.sizes.dialogMaxWidth,
  maxHeight: ThemeVars.sizes.dialogMaxHeight,
  maxWidth: ThemeVars.sizes.dialogMaxWidth,
  gridTemplateRows: '60px 1fr 60px',
  overflow: 'hidden',
  ...responsiveStyle({
    tabletWide: {
      gridTemplateRows: '78px 1fr 60px',
      height: '540px',
      width: '900px'
    }
  })
})
