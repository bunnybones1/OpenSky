import { style, styleVariants } from '@vanilla-extract/css'

export const RowArtFadeInImage = style({
  opacity: 0,
  transition: 'opacity 0.2s ease-in',
  selectors: {
    '&.isLoaded': {
      opacity: 1
    }
  }
})

export const RowArtWrapper = style({
  display: 'inline-flex',
  left: '0px',
  top: '0px'
})

export const RowArtColorVariants = styleVariants({
  default: {
    background:
      'linear-gradient(90deg, rgba(35, 20, 69, 1) 0%, rgba(35, 20, 69, 0.85) 21%, rgba(35, 20, 69, 0.58) 40%, rgba(35, 20, 69, 0.58) 55%, rgba(35, 20, 69, 0.15) 78%, rgba(35, 20, 69, 0.79) 94%, rgba(35, 20, 69, 1) 100%)'
  },
  secondary: {
    background: `linear-gradient(90deg, #1C1038 0%, rgba(28, 16, 56, 0.5) 50%, rgba(28, 16, 56, 0) 67.72%, rgba(28, 16, 56, 0.5) 79.29%, #1C1038 100%)`
  },
  blue: {
    background: `linear-gradient(90deg, #001641 0%, rgba(0, 22, 65, 0.5) 50%, rgba(0, 22, 65, 0) 67.72%, rgba(0, 22, 65, 0.5) 79.29%, #001641 100%)`
  }
})

export const UseHeightStyle = style({
  selectors: {
    '&.useHeight': {
      height: '100%',
      width: 'auto'
    },
    '&.useWidthHeight': {
      height: '100%',
      width: '100%',
      objectFit: 'cover'
    },
    '&:not(.useHeight):not(.useWidthHeight)': {
      width: '100%',
      height: 'auto'
    }
  }
})
