import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const HeaderHeroIconStyle = style({
  height: '25px',
  width: '25px',
  borderRadius: '50%',
  border: `1px solid ${ThemeVars.color.purple7}`
})

export const HeaderHeroIconImage = style({
  width: '145%',
  transform: 'translate(-14%, -16%)'
})
