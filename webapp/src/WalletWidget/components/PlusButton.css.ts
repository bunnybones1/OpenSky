import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

import { WALLET_WIDGET_CLASSNAME } from '../shared/constants'

export const HoverBorderPath = style({
  transition: 'all 0.125s ease-in-out',
  selectors: {
    [`.${WALLET_WIDGET_CLASSNAME}:hover &`]: {
      fill: ThemeVars.color.purple8
    }
  }
})

export const HoverPaintZero = style({
  transition: 'all 0.125s ease-in-out',
  selectors: {
    [`.${WALLET_WIDGET_CLASSNAME}:hover &`]: {
      fill: 'url(#plus-button-hover-paint-1)'
    }
  }
})

export const HoverFilterGroup = style({
  transition: 'all 0.125s ease-in-out',
  selectors: {
    [`.${WALLET_WIDGET_CLASSNAME}:hover &`]: {
      filter: 'url(#plus-button-filter)'
    }
  }
})

export const HoverGlow = style({
  transition: 'all 0.125s ease-in-out',
  selectors: {
    [`.${WALLET_WIDGET_CLASSNAME}:hover &`]: {
      fill: 'url(#plus-button-glow)'
    }
  }
})
