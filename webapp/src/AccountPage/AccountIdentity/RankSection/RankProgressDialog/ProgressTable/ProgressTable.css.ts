import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const ProgressTableStyle = style({
  width: 'auto',
  ...responsiveStyle({
    tablet: { width: '700px' }
  })
})

export const TableHeader = style({
  height: '42px',
  gridTemplateColumns: '2fr 1fr 1.1fr 1.1fr 1.1fr 1.1fr',
  alignItems: 'center',
  justifyContent: 'center'
})
