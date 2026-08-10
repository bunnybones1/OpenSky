import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const DeleteAccountDialogStyle = style({
  width: '600px',
  maxHeight: '100vh',
  overflow: 'auto',
  ...responsiveStyle({
    tabletWide: { width: '700px' }
  })
})

export const DeleteAccountDialogTitle = style({
  height: '60px',
  ...responsiveStyle({
    tabletWide: {
      height: '78px'
    }
  })
})

export const DeleteAccountDialogTextWrapper = style({
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  rowGap: '16px'
})

export const DeleteAccountDialogButtonWrapper = style({
  width: '152px',
  ...responsiveStyle({
    tabletWide: {
      width: '170px'
    }
  })
})
