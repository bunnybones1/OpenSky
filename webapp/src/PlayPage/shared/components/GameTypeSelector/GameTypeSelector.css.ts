import { keyframes, style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const GameTypeSelectorStyle = style({
  height: '38px',
  width: '280px',
  selectors: {
    '&.isLocked': {
      cursor: 'not-allowed'
    }
  }
})

export const GameTypeSelectorGradient = style({
  background: 'rgba(12, 6, 30, 0.8)'
})

export const GameTypeSelectorIcon = style({
  height: '50%'
})

export const GameTypeSelectorArrowWrapper = style({
  width: '24px',
  paddingRight: '2px',
  transition: 'border-color 0.125s ease-out',
  selectors: {
    [`${GameTypeSelectorStyle}:hover &`]: {
      borderColor: ThemeVars.color.purple9
    }
  }
})

export const GameTypeSelectorLock = style({
  top: '50%',
  transform: 'translateY(-50%)',
  right: '-1.5%'
})

export const GameTypeSelectorAngledBox = style({
  placeContent: 'unset!important',
  selectors: {
    '&.isLocked': {
      opacity: 0.5
    }
  }
})

const SlideIn = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateX(-100%)'
  },
  '100%': {
    opacity: 1,
    transform: 'translateX(0%)'
  }
})

export const GameTypeDialogClassName = style({
  selectors: {
    '&:modal': {
      top: '0px',
      left: '0px',
      maxHeight: 'unset',
      borderWidth: '0px',
      transform: 'none',
      overflow: 'auto',
      animation: `${SlideIn} 0.3s ease-in-out 1!important`
    }
  }
})
