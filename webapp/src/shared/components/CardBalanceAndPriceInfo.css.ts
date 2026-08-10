import { style } from '@vanilla-extract/css'

import { CARD_BASE_CLASSNAME } from '../constants/cards'

export const CardBalanceAndPriceInfoButtonOuter = style({
  selectors: {
    ['&.isSelected']: {
      opacity: 1
    },
    [`.${CARD_BASE_CLASSNAME}:hover &`]: {
      opacity: 1
    }
  }
})
