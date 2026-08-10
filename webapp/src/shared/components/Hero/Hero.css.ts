import { style } from '@vanilla-extract/css'

import { HERO_SKIN_RATIO } from '~/shared/constants/ui'

export const HeroSkinWrapper = style({
  paddingTop: `calc(${HERO_SKIN_RATIO} * 100%)`
})

export const HeroSkinImageWrapper = style({
  opacity: 1,
  selectors: {
    '&.isLocked': {
      opacity: 0.65
    }
  }
})

export const LockStyle = style({
  opacity: 1,
  transition: 'opacity 0.125s ease-in-out',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  selectors: {
    [`${HeroSkinWrapper}:hover &`]: {
      opacity: 0
    }
  }
})
