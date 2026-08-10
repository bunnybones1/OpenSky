import { keyframes, style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const HeroSelectButtonStyle = style({
  userSelect: 'none',
  transition: 'all 0.2s ease-in-out',
  backfaceVisibility: 'hidden',
  width: '80px',
  height: '80px',
  selectors: {
    '&:hover:not(.isSelected)': {
      transform: 'scale(1.03)',
      filter: `drop-shadow(0px 0px 4px ${ThemeVars.color.cold7})`
    },
    '&.isLocked': {
      opacity: 0.4,
      pointerEvents: 'none'
    },
    '&.isSelected': {
      filter: `drop-shadow(0px 0px 4px ${ThemeVars.color.cold7})`,
      overflow: 'hidden'
    }
  }
})

export const HeroSelectLock = style({
  width: '130px',
  height: '50px',
  left: '-21px',
  bottom: '-10px'
})

const Slide = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateX(100%)'
  },
  '50%': {
    opacity: 1
  },
  '100%': {
    opacity: 0,
    transform: 'translateX(-100%)'
  }
})

export const HeroSelectOverlay = style({
  [':after']: {
    content: '',
    opacity: 0,
    top: 0,
    left: 0,
    width: '100%',
    height: '240px',
    position: 'absolute',
    zIndex: 2,
    background: `linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.8) 50%,
      rgba(128, 186, 232, 0) 99%,
      rgba(125, 185, 232, 0) 100%
    )`
  },
  selectors: {
    '&.isSelected:after': {
      animation: `${Slide} 0.7s`
    }
  }
})
