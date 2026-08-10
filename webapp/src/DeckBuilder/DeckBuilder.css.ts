import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const DeckbuilderCardListStyle = style({
  paddingRight: '220px',
  ...responsiveStyle({
    tablet: {
      paddingRight: '300px'
    }
  })
})
