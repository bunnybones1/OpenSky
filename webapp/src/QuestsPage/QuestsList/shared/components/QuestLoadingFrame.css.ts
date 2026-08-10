import { keyframes, style } from '@vanilla-extract/css'

import MaskSVG from './QuestLoaderMask.svg'

const QuestLoaderSkeleton = keyframes({
  '100%': {
    transform: 'translateX(100%)'
  }
})

export const QuestLoadingFrameMask = style({
  maskImage: `url(${MaskSVG})`,
  WebkitMaskImage: `url(${MaskSVG})`,
  maskClip: 'border-box',
  WebkitMaskClip: 'border-box'
})

export const QuestLoadingFrameGradient = style({
  selectors: {
    '&:after': {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      content: '',
      transform: 'translateX(-100%)',
      animation: `${QuestLoaderSkeleton} 2s infinite`,
      backgroundImage: `linear-gradient(
          90deg,
          rgba(172, 143, 255, 0) 0,
          rgba(172, 143, 255, 0.2) 20%,
          rgba(172, 143, 255, 0.5) 60%,
          rgba(172, 143, 255, 0)
        )`
    }
  }
})
