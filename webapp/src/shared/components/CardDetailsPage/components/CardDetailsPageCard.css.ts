import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const CardDetailsPageCardStyle = style({
  width: '40vh',
  position: 'sticky',
  top: '56px',

  ...responsiveStyle({
    tablet: {
      width: '20%'
    },
    tabletWide: {
      width: '20%',
      position: 'static'
    }
  })
})

export const Inner = style({
  ...responsiveStyle({
    tabletWide: {
      paddingLeft: '48px',
      paddingRight: '48px'
    }
  })
})

export const FlavorText = style({
  fontStyle: 'italic',
  lineHeight: '20px'
})
