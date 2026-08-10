import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckViewerHeaderStyle = style({
  borderLeft: `1px solid ${ThemeVars.color.purple7}`,
  borderBottom: `1px solid ${ThemeVars.color.purple7}`
})

export const DeckViewerHeaderCloseButton = style({ zIndex: 5, width: '42px' })
