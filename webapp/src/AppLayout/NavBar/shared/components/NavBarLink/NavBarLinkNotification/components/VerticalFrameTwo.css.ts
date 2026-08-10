import { keyframes, style } from '@vanilla-extract/css'

import {
  FRAME_ONE_APPEAR,
  FRAME_TRANSITION_DELAY,
  FRAME_TWO_APPEAR,
  NOTIF_ANIM_DELAY,
  NOTIF_DISAPPEAR,
  NOTIF_READ_DELAY
} from '../shared/constants'

const FrameTwoVerticalClipMaskAnimation = keyframes({
  '0%': {
    width: '300px'
  },
  '100%': {
    width: '0px'
  }
})

export const FrameTwoVerticalClipMaskStyle = style({
  animationDelay: `${
    NOTIF_ANIM_DELAY +
    FRAME_ONE_APPEAR +
    FRAME_TRANSITION_DELAY +
    FRAME_TWO_APPEAR +
    NOTIF_READ_DELAY
  }ms`,
  animationTimingFunction: 'ease-in-out',
  animationDuration: `${NOTIF_DISAPPEAR}ms`,
  animationIterationCount: 1,
  animationName: `${FrameTwoVerticalClipMaskAnimation}`
})
