import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckCardsListBreakdownStyle = style({
  display: 'grid',
  gridAutoColumns: 'min-content',
  gridAutoFlow: 'column',
  columnGap: '12px',
  height: '39px',
  paddingLeft: '12px'
})

export const BreakdownCount = style({
  opacity: 1,
  transition: 'opacity 0.2s ease-in',
  padding: '6px 0px 4px 0px',
  selectors: {
    '&.isZero': {
      opacity: 0.3
    },
    '&.hasBorderLeft': {
      paddingLeft: '12px',
      borderLeft: `1px solid ${ThemeVars.color.purple6}`
    }
  }
})

export const BreakdownGradient = style({
  height: '19px',
  top: '41px',
  zIndex: 4,
  background: `linear-gradient(180deg, ${ThemeVars.color.purple1} 0%, rgba(12, 6, 30, 0) 100%)`
})
