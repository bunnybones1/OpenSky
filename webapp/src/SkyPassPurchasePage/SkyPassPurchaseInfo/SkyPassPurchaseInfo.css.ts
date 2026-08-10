import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { GlobalFadeIn } from '~/shared/style/Animations.css'
import { responsiveStyle } from '~/shared/style/Theme'

export const SkyPassPurchaseInfoStyle = style({
  paddingTop: '4px',
  width: '250px',
  height: '100vh',
  flexShrink: 0,
  animation: `${GlobalFadeIn} 0.6s ease-in-out`,
  ...responsiveStyle({
    tablet: {
      width: '400px'
    },
    tabletWide: {
      height: `calc(100vh - ${NAVBAR_HEIGHT}px)`
    }
  })
})

export const SkyPassPurchaseInfoImage = style({
  height: '43.5%',
  paddingTop: '0px',
  maxHeight: '170px',
  ...responsiveStyle({
    tablet: {
      paddingTop: '16px',
      height: '41.96%',
      maxHeight: '350px'
    },
    tabletWide: {
      height: '35.64%',
      maxHeight: '350px'
    }
  })
})

export const SkyPassPurchaseInfoDesc = style({
  marginTop: '-26px',
  ...responsiveStyle({
    tablet: {
      marginTop: '-49px'
    }
  })
})

export const SkyPassPurchaseInfoDescText = style({
  lineHeight: '140%',
  marginTop: '6px',
  ...responsiveStyle({
    tabletWide: {
      marginTop: '20px'
    }
  })
})
