import { style } from '@vanilla-extract/css'

export const DeckBuilderCardStyle = style({
  cursor: 'pointer',
  selectors: {
    '&.isNotClickable': {
      cursor: 'not-allowed'
    }
  }
})

export const DeckBuilderCardSelectedStyle = style({
  top: '0.2%',
  left: '-3%',
  width: '110%',
  zIndex: -1
})
