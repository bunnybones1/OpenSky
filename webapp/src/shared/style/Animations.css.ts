import { globalKeyframes } from '@vanilla-extract/css'

export const GlobalFadeIn = 'GlobalFadeIn'

globalKeyframes(GlobalFadeIn, {
  '0%': {
    opacity: 0
  },
  '100%': {
    opacity: 1
  }
})

export const GlobalFlashIn = 'GlobalFlashIn'

globalKeyframes(GlobalFlashIn, {
  '0%': {
    filter: 'contrast(90%) brightness(600%)',
    opacity: 0
  },
  '100%': {
    filter: 'contrast(100%) brightness(100%)',
    opacity: 1
  }
})

export const GlobalFlashOut = 'GlobalFlashOut'

globalKeyframes(GlobalFlashOut, {
  '0%': {
    filter: 'contrast(100%) brightness(100%)',
    opacity: 1
  },
  '100%': {
    filter: 'contrast(90%) brightness(600%)',
    opacity: 0
  }
})

export const GlobalPulse = 'GlobalPulse'

globalKeyframes(GlobalPulse, {
  '0%': { transform: 'scale(0.75); opacity: 1' },
  '100%': { transform: 'scale(1.5); opacity: 0' }
})
