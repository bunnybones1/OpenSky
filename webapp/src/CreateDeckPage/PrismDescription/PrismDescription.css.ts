import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const PrismDescriptionStyle = style({
  top: 0,
  right: 0,
  paddingRight: '20px',
  width: '50%',
  marginBottom: '0px',
  ...responsiveStyle({
    tablet: {
      top: 'initial',
      right: 'initial',
      width: 'initial',
      paddingRight: '0px',
      marginBottom: '80px'
    },
    tabletWide: {
      marginBottom: '60px'
    },
    desktopWide: {
      marginBottom: '0px'
    }
  })
})

export const PrismDescriptionInner = style({
  height: '260px',
  ...responsiveStyle({
    mobile: { height: '280px' },
    tablet: { height: '430px' },
    desktopWide: { height: '320px' }
  })
})

export const PrismDescriptionTextWrapper = style({
  width: '200px',
  ...responsiveStyle({
    tablet: {
      width: '290px'
    },
    desktopWide: {
      width: '420px'
    }
  })
})

export const PrismDescriptionDescription = style({
  lineHeight: 1.43,
  ...responsiveStyle({
    tablet: {
      lineHeight: 1.53
    }
  })
})
