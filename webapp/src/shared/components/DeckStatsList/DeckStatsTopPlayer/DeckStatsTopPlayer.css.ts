import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckTopPlayerLeaderboardLink = style({
  selectors: {
    '&:hover': {
      color: ThemeVars.color.purple9
    }
  }
})

export const NoTopPlayer = style({
  height: '36px',
  border: `1px solid ${ThemeVars.color.purple7}`
})
