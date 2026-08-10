import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

import { DECK_Z_INDEXES } from '../shared/constants'

export const DeckCardsCountStyle = style({
  bottom: '12.5%',
  left: '66%',
  position: 'absolute',
  zIndex: DECK_Z_INDEXES.DECK_STATS
})

export const DeckCardsCountSpanStyle = style({
  color: ThemeVars.color.cold8,
  selectors: {
    '&.isInvalid': {
      color: ThemeVars.color.warm8
    }
  }
})
