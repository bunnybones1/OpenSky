import { style } from '@vanilla-extract/css'

import { GlobalPulse } from '../style/Animations.css'
import { ThemeVars } from '../style/Theme.css'

export const UnreadPulseAnimTrigger = 'UnreadPulseAnimTrigger'

export const UnreadBubble = style({
  height: '20px',
  width: '20px',
  borderRadius: '50%',
  top: '0px',
  right: '8px',
  '::before': {
    content: '',
    position: 'absolute',
    top: '-4px',
    left: '-4px',
    right: '-4px',
    bottom: '-4px',
    border: `3px solid ${ThemeVars.color.warm6}`,
    borderRadius: '50%',
    zIndex: 2,
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease-in'
  },
  selectors: {
    '&.isLarge': {
      width: '26px',
      borderRadius: '99px'
    },
    '&.isLarge::before': {
      borderRadius: '99px'
    },
    [`&.${UnreadPulseAnimTrigger}::before`]: {
      opacity: 1,
      animation: `${GlobalPulse} 1s ease-out infinite`
    }
  }
})

export const UnreadBubbleInner = style({
  height: '16px',
  width: '16px',
  borderRadius: '50%',
  selectors: {
    '&.isLarge': {
      width: '20px',
      borderRadius: '99px'
    }
  }
})
