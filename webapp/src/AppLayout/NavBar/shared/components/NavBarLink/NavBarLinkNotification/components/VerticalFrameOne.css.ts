import { keyframes, style } from '@vanilla-extract/css'

import { FRAME_ONE_APPEAR, NOTIF_ANIM_DELAY } from '../shared/constants'

const FrameOneVerticalClipMaskAnimation = keyframes({
  '0%': {
    width: '0px'
  },
  '100%': {
    width: '300px'
  }
})

export const FrameOneVerticalClipMaskStyle = style({
  animationDelay: `${NOTIF_ANIM_DELAY}ms`,
  animationTimingFunction: 'ease-out',
  animationDuration: `${FRAME_ONE_APPEAR}ms`,
  animationIterationCount: 1,
  animationName: `${FrameOneVerticalClipMaskAnimation}`
})
