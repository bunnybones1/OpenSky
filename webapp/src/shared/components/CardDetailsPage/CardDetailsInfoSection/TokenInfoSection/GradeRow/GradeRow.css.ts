import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const GradeRowStyle = style({
  transition: 'background 0.2s ease-out',
  gridTemplateColumns: '1fr 0.75fr 1.25fr 0.5fr 1fr',
  gridTemplateRows: '1fr',
  height: '48px',
  selectors: {
    '&:not(:last-child)': {
      borderBottom: `1px solid ${ThemeVars.color.purple5}`
    }
  }
})
