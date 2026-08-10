import { keyframes, style, styleVariants } from '@vanilla-extract/css'

export const SingleCardContainerBase = style({
  position: 'relative',
  left: '27%',
  top: '0.8%',
  height: 'auto',
  width: '45%',
  transition: '200ms'
})

export const SingleCardContainer = styleVariants({
  primary: [SingleCardContainerBase],
  clickable: [
    SingleCardContainerBase,
    {
      selectors: {
        '&:hover': {
          transform: 'translateY(-3px)'
        }
      }
    }
  ]
})

const rotate = keyframes({
  '0%': { transform: 'rotate(0deg)', right: '27%' }
})

export const MultiCardContainer = style({
  position: 'absolute',
  marginRight: '5vh',
  animation: `${rotate} 0.3s`,
  zIndex: 3
})
