import { style } from '@vanilla-extract/css'

export const BasketItemRowStyle = style({
  height: '52px',
  flexShrink: 0,
  opacity: 1,
  gridTemplateColumns: '57.73% 29.11% 1fr',
  selectors: {
    '&.isUnavailable': {
      opacity: 0.4
    },
    '&:last-child': {
      borderBottomWidth: '0px'
    }
  }
})
