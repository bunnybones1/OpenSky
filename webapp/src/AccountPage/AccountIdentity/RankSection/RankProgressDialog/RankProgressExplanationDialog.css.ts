import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const RankProgressExplanationDialogStyle = style({
  width: ThemeVars.sizes.dialogMaxWidth,
  height: ThemeVars.sizes.dialogMaxHeight,
  ...responsiveStyle({
    tabletWide: {
      height: 'auto',
      width: 'auto'
    }
  })
})

export const RankProgressExplanationDialogHeader = style({
  maxWidth: '200px',
  width: '160px',
  ...responsiveStyle({
    tablet: {
      width: 'auto'
    }
  })
})
