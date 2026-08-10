import { style } from '@vanilla-extract/css'

export const QuestOverlayFlashStyle = style({
  zIndex: 10,
  selectors: {
    '&.isNew': {
      zIndex: 11
    }
  }
})
