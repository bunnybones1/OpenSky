import { style } from '@vanilla-extract/css'

import { GlobalFadeIn } from '~/shared/style/Animations.css'

export const RadialOverlay = style({
  zIndex: 5,
  position: 'relative'
})

export const RewardOverlayImageBckg = style({
  userSelect: 'none',
  pointerEvents: 'none',
  width: '100%'
})

export const RewardOverlayImage = style({
  userSelect: 'none',
  pointerEvents: 'none',
  width: '100%',
  animation: `${GlobalFadeIn} 0.5s ease-in-out`
})
