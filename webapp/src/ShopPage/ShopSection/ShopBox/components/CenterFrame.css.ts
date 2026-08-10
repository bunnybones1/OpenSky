import { style } from '@vanilla-extract/css'

import { SHOP_BOX_CLASSNAME } from '../shared/constants'

const MIN_HEIGHT = '12.8px'
const MAX_HEIGHT = '22.4px'

export const CenterFrameStyle = style({
  left: '50%',
  transform: 'translateX(-50%)',
  height: 'clamp(12.8px, 12.19cqw, 22.4px)',
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      height: `clamp(${MIN_HEIGHT}, 9.41cqw, ${MAX_HEIGHT})`
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      height: `clamp(${MIN_HEIGHT}, 3.04cqw, ${MAX_HEIGHT})`
    }
  }
})
