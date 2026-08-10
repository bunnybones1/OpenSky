import { style } from '@vanilla-extract/css'

export const DeckCardsListCardsStyle = style({
  flex: 1,
  overflowY: 'scroll',
  overflowX: 'hidden',
  display: 'grid',
  gridAutoFlow: 'row',
  rowGap: '0px',
  gridAutoRows: 'min-content',
  selectors: {
    '&::-webkit-scrollbar-thumb': {
      border: '0px solid transparent',
      borderRadius: '0px',
      backgroundColor: '#6c5ca7',
      backgroundClip: 'content-box'
    },
    '&::-webkit-scrollbar': {
      width: '5px'
    }
  }
})
