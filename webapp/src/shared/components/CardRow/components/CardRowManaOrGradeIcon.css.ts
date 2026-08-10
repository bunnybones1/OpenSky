import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const ManaIconWrapper = style({
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 4,
  left: '0px',
  right: 'auto',
  height: '28px',
  width: '28px',
  ...responsiveStyle({
    tabletWide: {
      height: '32px',
      width: '32px'
    }
  })
})

export const ManaIconText = style({
  top: '50%',
  left: '50%',
  zIndex: 6,
  transform: 'translate(-50%, calc(-50% - 1px))'
})
