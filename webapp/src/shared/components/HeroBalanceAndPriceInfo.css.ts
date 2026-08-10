import { style } from '@vanilla-extract/css'

import { HERO_BASE_CLASSNAME } from '../constants/hero-skins'

export const HeroBalanceAndPriceInfoButtonOuter = style({
  selectors: {
    ['&.isSelected']: {
      opacity: 1
    },
    [`.${HERO_BASE_CLASSNAME}:hover &`]: {
      opacity: 1
    }
  }
})
