import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const EmptyListImageWrapper = style({
  ...responsiveStyle({
    desktop: {
      height: '250px',
      marginTop: '0px'
    },
    mobile: {
      height: '200px',
      marginTop: '-60px'
    }
  })
})

export const EmptyListImage = style({
  height: '100%'
})

export const EmptyListEnd = style({
  width: '80%',
  ...responsiveStyle({
    desktop: {
      maxWidth: '800px'
    },
    mobile: {
      maxWidth: '500px'
    }
  })
})
