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

export const PriceContainerStyle = style({
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      top: `${getElementSize(250, MOBILE_VERTICAL_WIDTH)}cqw`,
      right: `${getElementSize(7, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          top: `${getElementSize(349.6, DESKTOP_VERTICAL_WIDTH)}cqw`,
          right: `${getElementSize(10, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      top: `${getElementSize(251, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      right: `${getElementSize(7, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          top: `${getElementSize(349.6, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          right: `${getElementSize(10, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})

export const PriceButtonStyle = style({
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &.isClaimed`]: {
      maxWidth: `${getElementSize(95, MOBILE_VERTICAL_WIDTH)}cqw`,
      width: 'initial',
      ...responsiveStyle({
        tabletWide: {
          minWidth: `${getElementSize(91, DESKTOP_VERTICAL_WIDTH)}cqw`,
          width: 'initial'
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &.isClaimed`]: {
      maxWidth: `${getElementSize(95, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      width: 'initial',
      ...responsiveStyle({
        tabletWide: {
          minWidth: `${getElementSize(91.2, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          width: 'initial'
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      width: `${getElementSize(65, MOBILE_VERTICAL_WIDTH)}cqw`,
      height: `${getElementSize(32, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(91, DESKTOP_VERTICAL_WIDTH)}cqw`,
          height: `${getElementSize(44.8, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      width: `${getElementSize(65, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      height: `${getElementSize(32, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(91.2, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          height: `${getElementSize(44.8, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})
