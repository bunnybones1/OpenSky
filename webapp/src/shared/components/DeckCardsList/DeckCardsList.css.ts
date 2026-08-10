import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckCardsListStyle = style({
  borderLeft: `1px solid ${ThemeVars.color.purple7}`
})

export const DeckCardsListFooterGradient = style({
  top: '-21px',
  height: '20px',
  zIndex: 3,
  background:
    'linear-gradient(180deg, rgba(12, 6, 29, 0) 0%, rgba(12, 6, 29, 0.8) 59.38%, #0C061E 86.98%)'
})
