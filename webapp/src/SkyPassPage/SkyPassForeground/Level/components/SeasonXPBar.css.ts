import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const XPBarContainer = style({
  height: '5px',
  textAlign: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  width: '100%',
  border: `1px solid ${ThemeVars.color.purple1}`
})
