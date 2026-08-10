import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const CardDetailsInfoSectionStyle = style({
  maxWidth: '70%',
  gridAutoFlow: 'row',
  rowGap: '12px',
  ...responsiveStyle({
    tabletWide: {
      maxWidth: '36%'
    }
  })
})
