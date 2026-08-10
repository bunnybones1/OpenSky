import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '../style/Theme'

export const ItemNewBadgeWrapper = style({
  width: '42px',
  height: '42px',
  top: '7%',
  right: '-5%',
  zIndex: 9,
  borderRadius: '100%',
  ...responsiveStyle({
    mobile: {
      width: '48px',
      height: '48px'
    },
    tabletWide: {
      width: '56px',
      height: '56px'
    }
  })
})

export const ItemNewBadgeInner = style({
  width: '32px',
  height: '32px',
  boxShadow: '0px 0px 6px 2px rgba(253, 150, 0, 0.3)',
  borderRadius: '100%',
  ...responsiveStyle({
    mobile: {
      width: '38px',
      height: '38px'
    },
    tabletWide: {
      width: '44px',
      height: '44px'
    }
  })
})
