import { style } from '@vanilla-extract/css'

export const CartItemListRowStyle = style({
  height: '60px',
  opacity: 1,
  borderBottom: '1px solid',
  gridTemplateColumns: '45% 15% 25% 15%',
  selectors: {
    '&.isUnavailable': {
      opacity: 0.4
    },
    '&:last-child': {
      borderBottomWidth: '0px'
    }
  }
})
