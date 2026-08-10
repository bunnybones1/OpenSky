import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const TitleRewardStyle = style({
  height: '150px',
  width: '150px',
  userSelect: 'none',

  ...responsiveStyle({
    mobile: {
      height: '175px',
      width: '175px'
    },
    tablet: {
      height: '300px',
      width: '300px'
    },
    desktop: {
      height: '350px',
      width: '350px'
    }
  })
})

export const TitleRewardContainer = style({
  width: '100vh',
  top: 0,

  ...responsiveStyle({
    tabletWide: {
      width: 'calc(100vh - 54px)',
      top: '-32px'
    }
  })
})
