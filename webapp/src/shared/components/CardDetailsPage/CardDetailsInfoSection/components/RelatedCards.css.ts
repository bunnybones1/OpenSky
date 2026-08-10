import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const RelatedCardsGrid = style({
  gridTemplateColumns: 'repeat(2, 1fr)',
  gridGap: '12px',
  ...responsiveStyle({
    tabletWide: {
      gridTemplateColumns: 'repeat(3, 1fr)'
    }
  })
})
