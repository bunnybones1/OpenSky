import { keyframes, style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckSelectorStyle = style({
  width: '280px'
})

export const DeckSelectorNoSelectionButton = style({
  width: '275px'
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

export const DeckSelectorDialogClassName = style({
  selectors: {
    '&:modal': {
      overflow: 'visible',
      top: '0px',
      left: '0px',
      maxHeight: 'unset',
      borderWidth: '0px',
      transform: 'none',
      borderRight: `1px solid ${ThemeVars.color.purple7}`,
      animation: `${SlideIn} 0.3s ease-in-out 1!important`
    }
  }
})
