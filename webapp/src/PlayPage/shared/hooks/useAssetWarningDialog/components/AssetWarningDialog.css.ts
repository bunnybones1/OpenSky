import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const AssetWarningDialogStyle = style({
  width: '80vw',
  maxWidth: '300px',
  maxHeight: '100vh',
  overflowX: 'hidden',
  overflowY: 'auto',
  padding: '2px',
  ...responsiveStyle({
    tabletWide: {
      width: '400px',
      maxWidth: 'unset'
    }
  })
})

export const AssetWarningDialogBg = style({
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  borderBottom: 'none',
  height: '50px',
  ...responsiveStyle({
    mobile: { height: '100px' },
    tablet: { height: '150px' }
  })
})

export const AssetWarningDialogProgress = style({
  width: 'calc(100% - 30px)'
})
