import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckRowInfoStyle = style({
  zIndex: 3,
  left: '15.5%',
  top: '12%',
  width: '57.41%',
  selectors: {
    '&.noGradeMeter': {
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }
})

export const DeckRowInfoCountSpan = style({
  color: ThemeVars.color.cold8,
  selectors: {
    '&.isInvalid': {
      color: ThemeVars.color.warm8
    }
  }
})
