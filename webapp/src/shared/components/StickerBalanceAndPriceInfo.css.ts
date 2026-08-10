import { style } from '@vanilla-extract/css'

import { STICKER_BASE_CLASSNAME } from '../constants/stickers'

export const StickerBalanceAndPriceInfoButtonOuter = style({
  selectors: {
    ['&.isSelected']: {
      opacity: 1
    },
    [`.${STICKER_BASE_CLASSNAME}:hover &`]: {
      opacity: 1
    }
  }
})
