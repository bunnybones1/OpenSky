import { style } from '@vanilla-extract/css'

import {
  GlobalFadeIn,
  GlobalFlashIn,
  GlobalFlashOut
} from '~/shared/style/Animations.css'
import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const ClaimRewardDialogTopAnchor = style({
  top: '8px',
  ...responsiveStyle({
    tabletWide: { top: '16px' }
  })
})

export const ClaimRewardDialogStyle = style({
  height: ThemeVars.sizes.dialogMaxHeight,
  width: ThemeVars.sizes.dialogMaxWidth,
  ...responsiveStyle({
    tabletWide: {
      height: '500px',
      width: '900px'
    },
    desktop: {
      height: '700px',
      width: '1400px'
    }
  })
})

export const ClaimRewardDialogBackground = style({
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundPosition: 'center center'
})

export const ClaimRewardNotificationContainer = style({
  animation: `${GlobalFadeIn} 0.2s ease-in-out`
})

export const ClaimRewardRewardImgContainer = style({
  ...responsiveStyle({
    tabletWide: {
      height: 'auto'
    }
  })
})

export const ClaimRewardCardRevealBack = style({
  animation: ` ${GlobalFlashOut} 0.5s ease-in forwards`
})

export const ClaimRewardCardRevealed = style({
  animation: ` ${GlobalFlashIn} 0.5s ease-in forwards`
})
