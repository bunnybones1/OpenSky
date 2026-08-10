import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '../style/Theme'
import { ThemeVars } from '../style/Theme.css'

export const RowWrapper = style({
  padding: '2px 0px',
  height: '36px',
  ...responsiveStyle({
    tablet: {
      height: '42px'
    },
    tabletWide: {
      height: '48px',
      padding: '4px 0px'
    }
  }),
  selectors: {
    '&.isLocked': {
      opacity: 0.4
    }
  }
})

export const NameWrapper = style({
  left: '32px',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  ...responsiveStyle({
    tablet: {
      left: '40px'
    }
  })
})

export const RowBorder = style({
  transition: 'border 0.2s ease-in',
  flex: 1,
  zIndex: 1,
  borderColor: ThemeVars.color.gray8,
  selectors: {
    '&.hoverBorder:hover': {
      borderColor: ThemeVars.color.gray9
    }
  }
})

export const RowOverlay = style({
  position: 'absolute',
  zIndex: 5,
  top: '2px',
  left: '2px',
  right: '2px',
  bottom: '2px',
  background: `linear-gradient(90deg, #142F45 0%, rgba(20, 40, 69, 0.3) 50%, rgba(6, 20, 30, 0) 67.72%, rgba(20, 48, 69, 0.3) 79.29%, #143345 100%)`
})

export const CardBackImg = style({
  height: '140%',
  right: '5%'
})

export const CardBackIcon = style({
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 4,
  left: '0px',
  right: 'auto'
})
