import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const AdminQuestsRow = style({
  gridTemplateColumns: '0.8fr 1.2fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr 0.8fr',
  height: '56px',
  gridAutoFlow: 'column'
})

export const AdminUserQuestsCell = style({
  borderBottom: '1px solid',
  borderLeft: '1px solid',
  borderColor: ThemeVars.color.purple7,
  height: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  display: 'flex'
})
