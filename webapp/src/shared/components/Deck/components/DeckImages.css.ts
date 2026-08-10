import { style } from '@vanilla-extract/css'

import { DECK_Z_INDEXES } from '../shared/constants'
import { DeckStyle } from '../shared/Deck.css'

export const DeckHighlight = style({
  opacity: 0,
  userSelect: 'none',
  zIndex: DECK_Z_INDEXES.HIGHLIGHT,
  transition: 'opacity 0.2s ease-in',
  '@media': {
    '(hover)': {
      selectors: {
        [`${DeckStyle}:hover &`]: {
          opacity: 1
        }
      }
    }
  },
  selectors: {
    '&.isHighlighted': {
      opacity: 1,
      filter: 'hue-rotate(230deg)'
    },
    [`${DeckStyle}.isSelected &`]: {
      opacity: 1
    }
  }
})

export const DeckTop = style({
  zIndex: DECK_Z_INDEXES.CARDS,
  userSelect: 'none'
})

export const DeckFrame = style({
  zIndex: DECK_Z_INDEXES.FRAME,
  userSelect: 'none'
})

export const PrismOrHeroIcon = style({
  width: '24%',
  height: 'auto',
  position: 'absolute',
  left: '38%',
  top: '80%',
  zIndex: DECK_Z_INDEXES.PRISM
})
