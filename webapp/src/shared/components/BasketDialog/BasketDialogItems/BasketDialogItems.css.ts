import { style } from '@vanilla-extract/css'

export const BasketDialogItemsStyle = style({
  overflowX: 'hidden',
  overflowY: 'auto',
  height: 'calc(100dvh - 40px)',
  paddingBottom: '36px'
})

export const ItemListHeader = style({
  gridTemplateColumns: '57.73% 29.11% 1fr',
  height: '38px',
  flexShrink: 0
})
