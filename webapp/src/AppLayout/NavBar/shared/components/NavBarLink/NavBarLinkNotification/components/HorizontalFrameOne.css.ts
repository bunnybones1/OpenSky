import { keyframes, style } from '@vanilla-extract/css'

import { FRAME_ONE_APPEAR, NOTIF_ANIM_DELAY } from '../shared/constants'

const FrameOneHorizontalClipMaskAnimation = keyframes({
  '0%': {
    height: '0px'
  },
  '100%': {
    height: '300px'
  }
})

export const FrameOneHorizontalClipMaskStyle = style({
  animationDelay: `${NOTIF_ANIM_DELAY}ms`,
  animationTimingFunction: 'ease-out',
  animationDuration: `${FRAME_ONE_APPEAR}ms`,
  animationIterationCount: 1,
  animationName: `${FrameOneHorizontalClipMaskAnimation}`
})
