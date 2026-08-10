import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const PrivateCodeSection = style({
  width: '200px',
  bottom: '106px',
  right: '17px',
  ...responsiveStyle({
    tabletWide: {
      width: '280px'
    }
  })
})

export const PracticeVsPlayerGrid = style({
  gridTemplateColumns: '1fr 40px',
  maxWidth: '100%',
  columnGap: '4px'
})
