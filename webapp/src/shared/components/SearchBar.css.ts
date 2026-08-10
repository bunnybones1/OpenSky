import { style, styleVariants } from '@vanilla-extract/css'

import {
  DISCLAIMER_HEIGHT,
  NAV_BAR_Z_INDEX,
  NAVBAR_HEIGHT,
  NAVBAR_WIDTH
} from '~/shared/constants/ui'

import { responsiveStyle } from '../style/Theme'

export const SearchBarStyle = style({
  transition: 'background 0.125s ease-in-out',
  zIndex: 11
})

export const SearchBarBgVariants = styleVariants({
  default: {
    background: `linear-gradient(
      180deg,
      rgba(12, 6, 30, 1) 0%,
      rgba(12, 6, 30, 1) 35%,
      rgba(12, 6, 30, 0.75) 65%,
      rgba(12, 6, 30, 0) 100%
    )`
  },
  green: {
    background: `linear-gradient(
      180deg,
      rgba(17, 39, 49, 1) 0%,
      rgba(17, 39, 49, 1) 35%,
      rgba(17, 39, 49, 0.75) 65%,
      rgba(17, 39, 49, 0) 100%
    )`
  },
  red: {
    background: `linear-gradient(
      180deg,
      rgba(38, 28, 54, 1) 0%,
      rgba(38, 28, 54, 1) 35%,
      rgba(38, 28, 54, 0.75) 65%,
      rgba(38, 28, 54, 0) 100%
    )`
  }
})

export const FilterPanelWrapper = style({
  zIndex: NAV_BAR_Z_INDEX - 1,
  pointerEvents: 'none',
  top: '0px',
  height: '100%',
  width: `calc(100% - ${NAVBAR_WIDTH}px)`,
  left: `${NAVBAR_WIDTH}px`,
  ...responsiveStyle({
    tabletWide: {
      top: `${NAVBAR_HEIGHT}px`,
      height: `calc(100% - ${NAVBAR_HEIGHT}px)`,
      width: '100%',
      left: '0px'
    }
  }),
  selectors: {
    '&.hasNoFilterPanelLeftPadding': {
      left: '0px',
      width: '100%'
    },
    '&.hasBannerMargin': {
      ...responsiveStyle({
        tabletWide: {
          top: `${NAVBAR_HEIGHT + DISCLAIMER_HEIGHT}px`,
          height: `calc(100% - ${NAVBAR_HEIGHT + DISCLAIMER_HEIGHT}px)`
        }
      })
    }
  }
})

export const FilterPanelUnderlay = style({
  transition: 'opacity 0.2s ease-in',
  pointerEvents: 'none',
  opacity: '0',
  cursor: 'initial',
  background:
    'linear-gradient(90deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.6) 100%)',
  selectors: {
    '&.isVisible': {
      cursor: 'pointer',
      opacity: '1',
      pointerEvents: 'all'
    }
  }
})

const FILTER_PANEL_WIDTH = 232

export const FilterPanel = style({
  transition: '0.2s ease-in-out',
  pointerEvents: 'none',
  width: `${FILTER_PANEL_WIDTH}px`,
  transform: `translateX(-${200 + NAVBAR_WIDTH}px)`,
  ...responsiveStyle({
    tabletWide: {
      transform: `translateX(-${FILTER_PANEL_WIDTH}px)`
    }
  }),
  zIndex: 2,
  borderRightWidth: '1px',
  borderRightStyle: 'solid',
  display: 'grid',
  gridAutoRows: 'minmax(min-content, max-content)',
  rowGap: '16px',
  overflowY: 'auto',
  selectors: {
    '&.isVisible': {
      pointerEvents: 'all',
      transform: 'translateX(0px)'
    }
  }
})
