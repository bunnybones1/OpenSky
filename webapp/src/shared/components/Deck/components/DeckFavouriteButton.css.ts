import { style } from '@vanilla-extract/css'

import { DECK_Z_INDEXES } from '../shared/constants'
import { DeckStyle } from '../shared/Deck.css'

export const DeckFavouriteButtonWrapper = style({
  opacity: 0,
  position: 'absolute',
  height: '32px',
  width: '32px',
  left: '14.5%',
  zIndex: DECK_Z_INDEXES.FAVOURITE,
  top: '19.5%',
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
    [`&.isFavourited, ${DeckStyle}.isSelected &`]: {
      opacity: 1
    },
    '&::before': {
      position: 'absolute',
      left: '-1px',
      top: '-1px',
      zIndex: -1,
      right: 0,
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderWidth: '32px 32px 0 0',
      content: '',
      borderColor: `#1E123A transparent transparent transparent`
    }
  }
})
