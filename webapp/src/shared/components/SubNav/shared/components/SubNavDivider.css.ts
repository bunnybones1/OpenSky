import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const SubNavDividerStyle = style({
  width: '1px',
  background: `linear-gradient(
    0deg,
    ${ThemeVars.color.purple7},
    ${ThemeVars.color.purple6},
    ${ThemeVars.color.purple4},
    ${ThemeVars.color.purple3},
    ${ThemeVars.color.purple1}
  );`
})
