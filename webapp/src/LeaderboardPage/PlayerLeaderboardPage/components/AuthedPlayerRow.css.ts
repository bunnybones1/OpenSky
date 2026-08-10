import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const ViewButtonStyle = style({
  top: '50%',
  transform: 'translateY(-50%)',
  right: '0px'
})

export const AuhtedPlayerRowLayout = style({
  borderColor: ThemeVars.color.cold7,
  backgroundColor: '#0d2130'
})
