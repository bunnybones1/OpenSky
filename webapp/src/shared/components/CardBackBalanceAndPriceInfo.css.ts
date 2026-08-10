import { style } from '@vanilla-extract/css'

import { CARDBACK_BASE_CLASSNAME } from '../constants/card-backs'

export const ButtonOuter = style({
  selectors: {
    ['&.isSelected']: {
      opacity: 1
    },
    [`.${CARDBACK_BASE_CLASSNAME}:hover &`]: {
      opacity: 1
    }
  }
})
