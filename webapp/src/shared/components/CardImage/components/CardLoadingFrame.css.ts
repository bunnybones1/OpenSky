import { style, styleVariants } from '@vanilla-extract/css'

export const CardLoadingFrameStyle = style({
  width: '97%',
  position: 'absolute',
  right: '1%',
  top: '1%',
  opacity: 1,
  transition: 'opacity 0.2s ease-out',
  selectors: {
    '&.isLoaded': {
      opacity: 0
    }
  }
})

export const RootStyle = style({
  isolation: 'isolate'
})

export const FrameLineVariant = styleVariants({
  air: {
    fill: '#71c6b8'
  },
  dark: {
    fill: '#6d3a70'
  },
  earth: {
    fill: '#32c11e'
  },
  fire: {
    fill: '#f40b0b'
  },
  light: {
    fill: '#ddbf2a'
  },
  metal: {
    fill: '#b5b58f'
  },
  mind: {
    fill: '#8830ef'
  },
  sky: {
    fill: '#6299e8'
  },
  water: {
    fill: '#6299e8'
  },
  default: {
    fill: '#4d407c'
  }
})
