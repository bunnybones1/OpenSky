import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const GoldSubText = style({
  color: ThemeVars.color.warm6,
  fontWeight: 600
})

export const SilverSubText = style({
  color: ThemeVars.color.gray8,
  fontWeight: 600
})

export const PurpleSubText = style({
  color: ThemeVars.color.purple9,
  fontWeight: 600
})
