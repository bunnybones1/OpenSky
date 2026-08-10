import { style } from '@vanilla-extract/css'

import { DECK_BUILDER_WIDTH } from '~/shared/constants/ui'
import { SAI_RIGHT_KEY, TOP_OFFSET_KEY } from '~/shared/style/constants'
import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const ToastsStyle = style({
  height: `calc(100% - var(${TOP_OFFSET_KEY}))`,
  rowGap: '8px',
  right: `calc(0px + var(${SAI_RIGHT_KEY}))`,
  left: 'auto',
  width: '260px',
  top: `var(${TOP_OFFSET_KEY})`,
  zIndex: 100,
  selectors: {
    '&.isCentered': {
      left: '50%',
      right: 'auto',
      transform: 'translateX(-50%)'
    },
    '&.isOnTopOfDeckViewer': {
      right: `calc(${DECK_BUILDER_WIDTH[0]}px + var(${SAI_RIGHT_KEY}))`,
      ...responsiveStyle({
        mobile: {
          right: `calc(${DECK_BUILDER_WIDTH[1]}px + var(${SAI_RIGHT_KEY}))`
        },
        tablet: {
          width: '316px',
          right: `calc(${DECK_BUILDER_WIDTH[2]}px + var(${SAI_RIGHT_KEY}))`
        },
        tabletWide: {
          right: `calc(${DECK_BUILDER_WIDTH[3]}px + var(${SAI_RIGHT_KEY}))`
        }
      })
    }
  },
  ...responsiveStyle({
    tabletWide: {
      top: `calc(var(${TOP_OFFSET_KEY}))`
    }
  })
})

export const ToastWrapper = style({
  borderRadius: '6px',
  transformOrigin: 'center',
  boxShadow: `0 0 10px 2px ${ThemeVars.color.purple7}`
})
