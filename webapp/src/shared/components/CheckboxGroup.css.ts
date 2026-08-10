import { style } from '@vanilla-extract/css'

export const CheckboxGroupStyle = style({
  display: 'inline-grid',
  columnGap: '12px',
  rowGap: '12px',
  gridAutoFlow: 'column',
  selectors: {
    '&.isVertical': {
      gridAutoFlow: 'row'
    }
  }
})
