import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const GameCreditsDialogStyle = style({
  height: ThemeVars.sizes.dialogMaxHeight,
  width: ThemeVars.sizes.dialogMaxWidth,
  maxHeight: ThemeVars.sizes.dialogMaxHeight,
  maxWidth: ThemeVars.sizes.dialogMaxWidth,
  gridTemplateRows: '60px 1fr',
  ...responsiveStyle({
    tabletWide: {
      width: '900px',
      gridTemplateRows: '78px 1fr'
    }
  })
})
