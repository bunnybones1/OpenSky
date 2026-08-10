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

export const OriginalPriceStyle = style({
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      width: `${getElementSize(81, MOBILE_VERTICAL_WIDTH)}cqw`,
      height: `${getElementSize(26, MOBILE_VERTICAL_WIDTH)}cqw`,
      top: `${getElementSize(256, MOBILE_VERTICAL_WIDTH)}cqw`,
      left: `${getElementSize(17, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(113.4, DESKTOP_VERTICAL_WIDTH)}cqw`,
          height: `${getElementSize(36.4, DESKTOP_VERTICAL_WIDTH)}cqw`,
          top: `${getElementSize(358.4, DESKTOP_VERTICAL_WIDTH)}cqw`,
          left: `${getElementSize(23.8, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      width: `${getElementSize(81, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      height: `${getElementSize(26, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      top: `${getElementSize(256, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      left: `${getElementSize(372, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(113.4, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          height: `${getElementSize(36.4, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          top: `${getElementSize(359, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          left: `${getElementSize(520, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})

export const OriginalPriceFrameStyle = style({
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      width: `${getElementSize(81, MOBILE_VERTICAL_WIDTH)}cqw`,
      height: `${getElementSize(26, MOBILE_VERTICAL_WIDTH)}cqw`,
      top: `${getElementSize(256, MOBILE_VERTICAL_WIDTH)}cqw`,
      left: `${getElementSize(17, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(113.86, DESKTOP_VERTICAL_WIDTH)}cqw`,
          height: `${getElementSize(25.2, DESKTOP_VERTICAL_WIDTH)}cqw`,
          top: `${getElementSize(5.6, DESKTOP_VERTICAL_WIDTH)}cqw`,
          left: `-${getElementSize(0.46, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      width: `${getElementSize(81, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      height: `${getElementSize(26, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      top: `${getElementSize(256, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      left: `${getElementSize(372, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          width: `${getElementSize(113.4, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          height: `${getElementSize(36.4, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          top: `${getElementSize(359, DESKTOP_HORIZONTAL_WIDTH)}cqw`,
          left: `${getElementSize(509, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})

export const OriginalPriceTextStyle = style({
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      marginRight: `${getElementSize(8, MOBILE_VERTICAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          marginRight: `${getElementSize(8, DESKTOP_VERTICAL_WIDTH)}cqw`
        }
      })
    },
    [`.${SHOP_BOX_CLASSNAME}.isHorizontal &`]: {
      marginRight: `${getElementSize(8, MOBILE_HORIZONTAL_WIDTH)}cqw`,
      ...responsiveStyle({
        tabletWide: {
          marginRight: `${getElementSize(8, DESKTOP_HORIZONTAL_WIDTH)}cqw`
        }
      })
    }
  }
})

export const OriginalPriceFontStyle = style({
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

export const OriginalPriceImageStyle = style({
  opacity: 0.5,
  width: '10px',
  marginRight: '2px',
  ...responsiveStyle({
    tablet: {
      marginRight: '4px',
      width: '16px'
    }
  }),
  selectors: {
    [`.${SHOP_BOX_CLASSNAME}.isVertical &`]: {
      width: '10px',
      marginRight: '2px',
      ...responsiveStyle({
        tablet: {
          marginRight: '4px',
          width: '16px'
        }
      })
    }
  }
})

export const OriginalPriceLineStyle = style({
  height: '1px',
  marginTop: '1px'
})
