import { style } from '@vanilla-extract/css'

export const BasketDialogOverride = style({
  border: 'none',
  selectors: {
    '&:modal': {
      maxHeight: 'unset',
      maxWidth: 'unset',
      top: 0,
      left: 0,
      overflow: 'hidden',
      transform: 'none'
    }
  }
})
