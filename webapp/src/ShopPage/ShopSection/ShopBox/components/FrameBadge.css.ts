import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

import {
  DESKTOP_HORIZONTAL_WIDTH,
  DESKTOP_VERTICAL_WIDTH,
  MOBILE_HORIZONTAL_WIDTH,
  MOBILE_VERTICAL_WIDTH,
  SHOP_BOX_CLASSNAME
} from '../shared/constants'
import { getElementSize } from '../shared/utils'

export const FrameBadgeStyle = style({
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      width: `${getElementSize(62, MOBILE_VERTICAL_WIDTH)}cqw`,
      top: `-${getElementSize(7, MOBILE_VERTICAL_WIDTH)}cqw`,
      right: `-${getElementSize(7, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(86, DESKTOP_VERTICAL_WIDTH)}cqw`,
          top: `-${getElementSize(7, DESKTOP_VERTICAL_WIDTH)}cqw`,
          right: `-${getElementSize(7, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      width: `${getElementSize(62, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      top: `-${getElementSize(7, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      right: `-${getElementSize(7, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(86, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          top: `-${getElementSize(7, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          right: `-${getElementSize(7, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})

export const FrameBadgeAmount = style({
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      fontSize: `${getElementSize(14, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          fontSize: `${getElementSize(19.6, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      fontSize: `${getElementSize(14, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          fontSize: `${getElementSize(19.6, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})

export const FrameBadgeAmountText = style({
  marginTop: '1px',
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      fontSize: `${getElementSize(10, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          fontSize: `${getElementSize(14, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      fontSize: `${getElementSize(10, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          fontSize: `${getElementSize(14, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})
