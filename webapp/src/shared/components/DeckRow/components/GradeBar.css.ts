import { style } from '@vanilla-extract/css'

export const GradeBarStyle = style({
  left: '28px',
  zIndex: 3,
  selectors: {
    '&.isLarge': {
      left: '40px'
    }
  }
})
