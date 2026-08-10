import { style } from '@vanilla-extract/css'

import { GlobalFadeIn } from '~/shared/style/Animations.css'
import { responsiveStyle } from '~/shared/style/Theme'

export const SkyPassPurchaseDetailsStyle = style({
  rowGap: '22px',
  paddingTop: '100px',
  maxWidth: '400px',
  flexShrink: 1,
  flexGrow: 0,
  animation: `${GlobalFadeIn} 0.6s ease-in-out`,
  ...responsiveStyle({
    tablet: {
      maxWidth: '442px',
      paddingTop: '72px'
    }
  })
})
