import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const SkyTagTitleSelectorStyle = style({
  transition: 'border 0.2s ease-out',
  selectors: {
    '&:hover': {
      borderColor: ThemeVars.color.purple8
    },
    '&.isSelected': {
      borderColor: ThemeVars.color.purple9
    }
  }
})
