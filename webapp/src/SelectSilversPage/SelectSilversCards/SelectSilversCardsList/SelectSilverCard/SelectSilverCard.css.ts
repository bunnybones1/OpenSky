import { style } from '@vanilla-extract/css'

export const SelectedStyle = style({
  top: '1%',
  left: '-2%',
  width: '108%',
  zIndex: -1,
  transition: 'opacity 0.125s ease-in',
  selectors: {
    '&.isSelected': {
      opacity: 1
    }
  }
})
