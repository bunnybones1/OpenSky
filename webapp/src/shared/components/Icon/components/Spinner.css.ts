import { keyframes, style } from '@vanilla-extract/css'

const SpinSpinner = keyframes({
  '0%': {
    transform: 'rotate(0deg)'
  },
  '100%': {
    transform: 'rotate(360deg)'
  }
})

export const SpinPathStyle = style({
  animationName: SpinSpinner,
  animationDuration: '1.2s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'cubic-bezier(0.5, 0, 0.5, 1)'
})
