import { keyframes, style } from '@vanilla-extract/css'

import {
  FRAME_ONE_APPEAR,
  FRAME_TRANSITION_DELAY,
  FRAME_TWO_APPEAR,
  NOTIF_ANIM_DELAY
} from './constants'

const LinkGradientAnimation = keyframes({
  '0%': {
    opacity: 0
  },
  '100%': {
    opacity: 1
  }
})

export const LinkGradientStyle = style({
  animationName: `${LinkGradientAnimation}`,
  animationDuration: `${FRAME_ONE_APPEAR}ms`,
  animationDelay: `${NOTIF_ANIM_DELAY}ms`,
  animationTimingFunction: 'ease-out',
  animationIterationCount: 1
})

export const HorizontalFrameStyle = style({
  left: '50%',
  transform: 'translateX(-50%)'
})

export const VerticalFrameStyle = style({
  top: '50%',
  transform: 'translateY(-50%)'
})

const FrameOneFadeOutAnimation = keyframes({
  '0%': {
    opacity: 1
  },
  '100%': {
    opacity: 0
  }
})

export const FrameOneStyle = style({
  animationDelay: `${FRAME_ONE_APPEAR + NOTIF_ANIM_DELAY + FRAME_TRANSITION_DELAY}ms`,
  animationDuration: `${FRAME_TWO_APPEAR}ms`,
  animationTimingFunction: 'ease-in',
  animationName: `${FrameOneFadeOutAnimation}`,
  animationIterationCount: 1
})

export const FrameTwoFadeAnimation = keyframes({
  '0%': {
    opacity: 0
  },
  '100%': {
    opacity: 1
  }
})

export const FrameTwoStyle = style({
  animationDelay: `${NOTIF_ANIM_DELAY + FRAME_ONE_APPEAR + FRAME_TRANSITION_DELAY}ms`,
  animationIterationCount: 1,
  animationTimingFunction: 'ease-out',
  animationDuration: `${FRAME_TWO_APPEAR}ms`,
  animationName: `${FrameTwoFadeAnimation}`
})
