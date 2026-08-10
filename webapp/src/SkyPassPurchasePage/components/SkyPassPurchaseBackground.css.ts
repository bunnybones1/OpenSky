import { style } from '@vanilla-extract/css'

import { GlobalFadeIn } from '~/shared/style/Animations.css'
import { responsiveStyle } from '~/shared/style/Theme'

export const TopGradient = style({
  height: '11.5%',
  background: 'linear-gradient(180deg, #0C061E 0%, rgba(12, 6, 30, 0) 83.33%)',
  ...responsiveStyle({
    tablet: {
      height: '14.4%',
      background: 'linear-gradient(180deg, #0C061E 0%, rgba(12, 6, 30, 0) 100%)'
    },
    tabletWide: {
      height: '15.3%',
      background: 'linear-gradient(180deg, #0C061E 0%, rgba(12, 6, 30, 0) 100%)'
    }
  }),
  animation: `${GlobalFadeIn} 0.6s ease-in-out`
})

export const BottomGradient = style({
  height: '11.5%',
  background: 'linear-gradient(0deg, #0C061E 0%, rgba(12, 6, 30, 0) 83.33%)',
  ...responsiveStyle({
    tablet: {
      height: '14.4%',
      background: 'linear-gradient(0deg, #0C061E 0%, rgba(12, 6, 30, 0) 100%)'
    },
    tabletWide: {
      height: '15.3%',
      background: 'linear-gradient(0deg, #0C061E 0%, rgba(12, 6, 30, 0) 100%)'
    }
  }),
  animation: `${GlobalFadeIn} 0.6s ease-in-out`
})

export const SkyPassPurchaseBackgroundStyle = style({
  backgroundSize: 'cover!important',
  backgroundRepeat: 'no-repeat',
  filter: 'brightness(85%)',
  animation: `${GlobalFadeIn} 0.6s ease-in-out`
})
