import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const RankedBottomSection = style({
  bottom: '30px',
  gridTemplateColumns: '2fr 148px',
  columnGap: '8px',
  ...responsiveStyle({
    tablet: { gridTemplateColumns: '3fr 148px' },
    tabletWide: { gridTemplateColumns: '4fr 1fr' }
  })
})

export const RankedLockIcon = style({
  top: '-18px',
  zIndex: 100,
  left: 'calc(50% - 16px)'
})

export const RankedButtonSection = style({
  rowGap: '16px'
})
