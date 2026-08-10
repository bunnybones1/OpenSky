import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const RewardInfoTitleStyle = style({
  textShadow:
    '0 0 5px #000, 0 0 5px #000, 0 0 5px #000,0 0 5px #000,0 0 5px #000,0 0 5px #000,0 0 5px #000,0 0 5px #000, 0 0 5px #000',
  textTransform: 'uppercase'
})

export const RewardInfoButton = style({
  width: '160px',

  ...responsiveStyle({
    tabletWide: { width: '220px' },
    desktop: { width: '260px' }
  })
})

export const RewardInfoLock = style({
  left: 'calc(50% - 23px)',
  top: '-15px',
  width: '46px',

  ...responsiveStyle({
    tabletWide: {
      left: 'calc(50% - 35px)',
      width: '70px',
      top: '-24px'
    }
  })
})
