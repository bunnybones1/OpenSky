import { keyframes, style } from '@vanilla-extract/css'

const LogoAnim = keyframes({
  '0%': {
    transform: 'scale(1)',
    opacity: 1
  },
  '50%': {
    transform: 'scale(0.95)',
    opacity: 0.3
  },
  '100%': {
    transform: 'scale(1)',
    opacity: 1
  }
})

export const IndexPageLoaderStyle = style({
  width: '100vw',
  height: '100vh',
  paddingTop: '50px'
})

export const IndexPageLoaderLogo = style({
  animation: `3s ${LogoAnim} ease-in-out infinite`,
  marginTop: '-50px'
})
