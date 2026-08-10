import { style } from '@vanilla-extract/css'

import { SHOP_BOX_CLASSNAME } from '../shared/constants'

const MIN_HEIGHT = '27px'
const MAX_HEIGHT = '50px'

export const FrameCornerStyle = style({
  selectors: {
    '&.isTopRight': {
      transform: 'scaleX(-1)'
    },
    '&.isBottomRight': {
      transform: 'scale(-1, -1)'
    },
    '&.isBottomLeft': {
      transform: 'scaleY(-1)'
    },
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      height: `clamp(${MIN_HEIGHT}, 20cqw, ${MAX_HEIGHT})`
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      height: `clamp(${MIN_HEIGHT}, 6.5cqw, ${MAX_HEIGHT})`
    }
  }
})
