import { keyframes, style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT, NAVBAR_WIDTH } from '~/shared/constants/ui'
import { ThemeVars } from '~/shared/style/Theme.css'

import {
  FRAME_ONE_APPEAR,
  FRAME_TRANSITION_DELAY,
  FRAME_TWO_APPEAR,
  NOTIF_ANIM_DELAY,
  NOTIF_DISAPPEAR,
  NOTIF_READ_DELAY
} from '../shared/constants'

const ANIM_DURATION =
  // 200
  FRAME_ONE_APPEAR +
  // 50
  FRAME_TRANSITION_DELAY +
  // 300
  FRAME_TWO_APPEAR +
  // 2400
  NOTIF_READ_DELAY +
  // 200
  NOTIF_DISAPPEAR

// 3150 total

const VerticalNotifTextAnim = keyframes({
  '0%': {
    color: ThemeVars.color.white,
    transform: `translate(-${75 - NAVBAR_WIDTH}px, -50%)`,
    opacity: 0,
    filter: 'drop-shadow(0px 0px 0px #FF730D)'
  },
  // Frame One
  [`${(FRAME_ONE_APPEAR / ANIM_DURATION) * 100}%`]: {
    color: ThemeVars.color.white,
    transform: 'translate(0px, -50%)',
    opacity: 1,
    filter: 'drop-shadow(0px 0px 0px #FF730D)'
  },
  [`${((FRAME_ONE_APPEAR + FRAME_TRANSITION_DELAY) / ANIM_DURATION) * 100}%`]: {
    color: ThemeVars.color.white,
    transform: 'translate(0px, -50%)',
    opacity: 1,
    filter: 'drop-shadow(0px 0px 0px #FF730D)'
  },
  [`${
    ((FRAME_ONE_APPEAR + FRAME_TRANSITION_DELAY + FRAME_TWO_APPEAR) / ANIM_DURATION) *
    100
  }%`]: {
    color: ThemeVars.color.black,
    transform: 'translate(0px, -50%)',
    opacity: 1,
    filter: 'drop-shadow(0px 0px 6px #FF730D)'
  },
  [`${
    ((FRAME_ONE_APPEAR +
      FRAME_TRANSITION_DELAY +
      FRAME_TWO_APPEAR +
      NOTIF_READ_DELAY) /
      ANIM_DURATION) *
    100
  }%`]: {
    color: ThemeVars.color.black,
    transform: 'translate(0px, -50%)',
    opacity: 1,
    filter: 'drop-shadow(0px 0px 6px #FF730D)'
  },
  '100%': {
    color: ThemeVars.color.black,
    filter: 'drop-shadow(0px 0px 6px #FF730D)',
    opacity: 0,
    transform: `translate(-${75 - NAVBAR_WIDTH}px, -50%)`
  }
})

const HorizontalNotifTextAnim = keyframes({
  '0%': {
    color: ThemeVars.color.white,
    transform: `translate(-50%, -${80 - NAVBAR_HEIGHT}px)`,
    opacity: 0,
    filter: 'drop-shadow(0px 0px 0px #FF730D)'
  },
  // Frame One
  [`${(FRAME_ONE_APPEAR / ANIM_DURATION) * 100}%`]: {
    color: ThemeVars.color.white,
    transform: 'translate(-50%, 0px)',
    opacity: 1,
    filter: 'drop-shadow(0px 0px 0px #FF730D)'
  },
  [`${((FRAME_ONE_APPEAR + FRAME_TRANSITION_DELAY) / ANIM_DURATION) * 100}%`]: {
    color: ThemeVars.color.white,
    transform: 'translate(-50%, 0px)',
    opacity: 1,
    filter: 'drop-shadow(0px 0px 0px #FF730D)'
  },
  [`${
    ((FRAME_ONE_APPEAR + FRAME_TRANSITION_DELAY + FRAME_TWO_APPEAR) / ANIM_DURATION) *
    100
  }%`]: {
    color: ThemeVars.color.black,
    transform: 'translate(-50%, 0px)',
    opacity: 1,
    filter: 'drop-shadow(0px 0px 6px #FF730D)'
  },
  [`${
    ((FRAME_ONE_APPEAR +
      FRAME_TRANSITION_DELAY +
      FRAME_TWO_APPEAR +
      NOTIF_READ_DELAY) /
      ANIM_DURATION) *
    100
  }%`]: {
    color: ThemeVars.color.black,
    transform: 'translate(-50%, 0px)',
    opacity: 1,
    filter: 'drop-shadow(0px 0px 6px #FF730D)'
  },
  '100%': {
    color: ThemeVars.color.black,
    filter: 'drop-shadow(0px 0px 6px #FF730D)',
    opacity: 0,
    transform: `translate(-50%, -${80 - NAVBAR_HEIGHT}px)`
  }
})

export const NotifTextClipPathAnim = keyframes({
  '0%': {
    backgroundColor: ThemeVars.color.white
  },
  // Frame One
  [`${(FRAME_ONE_APPEAR / ANIM_DURATION) * 100}%`]: {
    backgroundColor: ThemeVars.color.white
  },
  [`${((FRAME_ONE_APPEAR + FRAME_TRANSITION_DELAY) / ANIM_DURATION) * 100}%`]: {
    backgroundColor: ThemeVars.color.white
  },
  [`${
    ((FRAME_ONE_APPEAR + FRAME_TRANSITION_DELAY + FRAME_TWO_APPEAR) / ANIM_DURATION) *
    100
  }%`]: {
    backgroundColor: '#FFE600'
  },
  '100%': {
    backgroundColor: '#FFE600'
  }
})

export const NavBarLinkNotificationTextStyle = style({
  left: '75px',
  top: '50%',
  transform: 'translateY(-50%)',
  animationDelay: `${NOTIF_ANIM_DELAY}ms`,
  filter: 'drop-shadow(0px 0px 6px #FF730D)',
  animationDuration: `${ANIM_DURATION}ms`,
  animationTimingFunction: 'ease-in-out',
  animationName: `${VerticalNotifTextAnim}`,
  whiteSpace: 'nowrap',
  animationIterationCount: 1,
  '::before': {
    clipPath: `polygon(10px 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0% 50%)`,
    content: '',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: -1,
    backgroundColor: '#FFE600',
    animationDelay: `${NOTIF_ANIM_DELAY}ms`,
    animationDuration: `${ANIM_DURATION}ms`,
    animationTimingFunction: 'ease-in-out',
    animationName: `${NotifTextClipPathAnim}`,
    animationIterationCount: 1
  },
  selectors: {
    '&.isHorizontal': {
      left: '50%',
      transform: 'translateX(-50%)',
      top: '80px',
      animationName: `${HorizontalNotifTextAnim}`
    }
  }
})
