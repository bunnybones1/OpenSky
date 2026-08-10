import { keyframes, style } from '@vanilla-extract/css'

const rotate = keyframes({
  '0%': { transform: 'rotate(0deg)', right: '27%' }
})

export const CardContainerBase = style({
  position: 'absolute',
  marginRight: '5vh',
  animation: `${rotate} 0.3s`
})
