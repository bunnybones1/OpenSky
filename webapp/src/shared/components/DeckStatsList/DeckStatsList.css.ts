import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckStatsListStyle = style({
  rowGap: '28px',
  gridAutoRows: 'min-content',
  gridAutoFlow: 'row',
  overflowY: 'auto',
  overflowX: 'hidden',
  borderLeft: `1px solid ${ThemeVars.color.purple7}`,
  zIndex: 5,
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
