import { style } from '@vanilla-extract/css'

import { STICKER_RATIO } from '~/shared/constants/ui'

export const StickerWrapper = style({
  paddingTop: `calc(${STICKER_RATIO} * 100%)`
})

export const StickerImageWrapper = style({
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
    [`${StickerWrapper}:hover &`]: {
      opacity: 0
    }
  }
})
