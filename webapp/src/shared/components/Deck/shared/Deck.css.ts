import { style } from '@vanilla-extract/css'

import { DECK_Z_INDEXES } from './constants'

export const DeckWrapperStyle = style({
  paddingTop: 'calc((153 / 100) * 100%)'
})

export const DeckStyle = style({
  zIndex: DECK_Z_INDEXES.BASE,
  selectors: {
    '&.isLocked': {
      opacity: 0.6
    }
  }
})

export const LockWrapper = style({
  zIndex: DECK_Z_INDEXES.LOCK
})

export const InvalidDeckIcon = style({
  right: '8%',
  bottom: '9%',
  zIndex: DECK_Z_INDEXES.DECK_STATS
})

export const DeckSettingsButton = style({
  right: '12%',
  top: '18%',
  zIndex: DECK_Z_INDEXES.DECK_STATS
})

export const DeckCostGraph = style({
  right: '65%',
  bottom: '11.5%',
  zIndex: DECK_Z_INDEXES.DECK_STATS
})
