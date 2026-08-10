import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckLeaderboardRowStyle = style({
  transition: 'background 0.125s ease-out',
  selectors: {
    '&:hover': {
      backgroundColor: ThemeVars.color.purple3
    },
    '&.isSelected': {
      backgroundColor: ThemeVars.color.purple4
    }
  }
})
