import { keyframes, style, styleVariants } from '@vanilla-extract/css'

const Slide = keyframes({
  '0%': { left: '-30%' },
  '100%': { left: '120%' }
})

export const BadgeContainerBase = style({
  position: 'relative',
  zIndex: 10,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  WebkitMaskComposite: 'destination-atop'
})

export const BadgeContainer = styleVariants({
  primary: [BadgeContainerBase],
  animate: [
    BadgeContainerBase,
    {
      selectors: {
        '&:before': {
          position: 'absolute',
          content: '',
          backgroundColor: 'white',
          height: '100%',
          width: '20%',
          transform: 'skewX(-30deg)',
          left: '-30%',
          overflow: 'hidden',
          animation: `${Slide} 0.5s ease-out`,
          animationDelay: '0.3s'
        }
      }
    }
  ]
})
