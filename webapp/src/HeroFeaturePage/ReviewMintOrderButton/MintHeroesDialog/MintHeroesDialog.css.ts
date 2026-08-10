import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const MintHeroesDialogStyle = style({
  height: ThemeVars.sizes.dialogMaxHeight,
  width: ThemeVars.sizes.dialogMaxWidth,
  ...responsiveStyle({
    tabletWide: {
      height: '540px',
      width: '900px'
    }
  })
})

export const MintHeroesHeaderStyle = style({
  height: '52px',
  ...responsiveStyle({
    tabletWide: {
      height: '80px'
    }
  })
})

export const MintHeroesControlsStyle = style({
  height: '60px',
  ...responsiveStyle({
    tabletWide: {
      height: '80px'
    }
  })
})

export const MintHeroesSkinsStyle = style({
  maxWidth: '285px',
  ...responsiveStyle({
    tabletWide: {
      maxWidth: '300px'
    }
  })
})
