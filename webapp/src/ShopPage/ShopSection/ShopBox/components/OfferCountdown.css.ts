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

export const OfferCountdownContainerStyle = style({
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      top: `${getElementSize(18, MOBILE_VERTICAL_WIDTH)}cqw`,
      left: `${getElementSize(14, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          top: `${getElementSize(25.2, DESKTOP_VERTICAL_WIDTH)}cqw`,
          left: `${getElementSize(19.6, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      top: `${getElementSize(18, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      left: `${getElementSize(14, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          top: `${getElementSize(25.2, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          left: `${getElementSize(19.6, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})

export const OfferCountdownFontSize = style({
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      fontSize: `${getElementSize(12, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          fontSize: `${getElementSize(14, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      fontSize: `${getElementSize(12, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          fontSize: `${getElementSize(14, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})

export const OfferCountdownIconSize = style({
  marginRight: '2px',
  ...responsiveStyle({
    tabletWide: {
      marginRight: '2.8px'
    }
  }),
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      width: `${getElementSize(12, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(14, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      width: `${getElementSize(12, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(14, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})
