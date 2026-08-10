import { style } from '@vanilla-extract/css'

export const CardImageStyle = style({
  opacity: 0,
  transition: 'opacity 0.3s ease-in-out',
  width: '100%',
  selectors: {
    '&.isLoaded': {
      opacity: 1
    }
  }
})
