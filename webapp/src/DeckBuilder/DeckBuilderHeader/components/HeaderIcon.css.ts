import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const DeckBuilderHeaderIconStyle = style({
  width: '28px',
  height: '28px',
  ...responsiveStyle({
    tabletWide: {
      width: '36px',
      height: '36px'
    }
  })
})
