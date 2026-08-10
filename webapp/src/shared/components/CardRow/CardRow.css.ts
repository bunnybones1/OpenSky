import { ItemType } from '@opensky/proto'
import { style, styleVariants } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const CardRowWrapper = style({
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

export const CardRowTypeIcon = style({
  height: '20px',
  width: '20px',
  top: '50%',
  transform: 'translateY(-50%)',
  position: 'absolute',
  zIndex: 4,
  left: 'auto',
  right: '20px',
  ...responsiveStyle({
    tabletWide: {
      height: '24px',
      width: '24px',
      right: '36px'
    },
    tablet: {
      height: '24px',
      width: '24px',
      right: '32px'
    },
    mobile: {
      right: '28px'
    }
  }),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
})

export const CardNameWrapper = style({
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

export const CardElementWrapper = style({
  right: '4px',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 3,
  ...responsiveStyle({
    mobile: {
      right: '6px'
    },
    tablet: {
      right: '8px'
    }
  })
})

export const CardRowBorder = style({
  transition: 'border 0.2s ease-in',
  flex: 1,
  zIndex: 1
})

export const CardRowBorderColor = styleVariants({
  [ItemType.SW_BASE_CARDS]: {
    borderColor: ThemeVars.color.purple8,
    selectors: {
      '&.hoverBorder:hover': {
        borderColor: ThemeVars.color.purple9
      }
    }
  },
  [ItemType.SW_SILVER_CARDS]: {
    borderColor: ThemeVars.color.gray8,
    selectors: {
      '&.hoverBorder:hover': {
        borderColor: ThemeVars.color.white
      }
    }
  },
  [ItemType.SW_GOLD_CARDS]: {
    borderColor: ThemeVars.color.warm6,
    selectors: {
      '&.hoverBorder:hover': {
        borderColor: ThemeVars.color.white
      }
    }
  },
  locked: {
    borderColor: ThemeVars.color.purple6,
    selectors: {
      '&.hoverBorder:hover': {
        borderColor: ThemeVars.color.purple8
      }
    }
  }
})

export const CardRowGradeOverlay = style({
  position: 'absolute',
  zIndex: 5,
  top: '0px',
  left: '0px'
})

export const CardRowGradeOverlayBg = styleVariants({
  [ItemType.SW_BASE_CARDS]: {
    background: `linear-gradient(
      90deg,
      #231445 0%,
      rgba(35, 20, 69, 0.5) 50%,
      rgba(12, 6, 30, 0) 67.72%,
      rgba(35, 20, 69, 0.5) 79.29%,
      #231445 100%
    )`
  },
  [ItemType.SW_SILVER_CARDS]: {
    background: `linear-gradient(
      90deg,
      #142845 0%,
      rgba(20, 40, 69, 0.3) 50%,
      rgba(6, 20, 30, 0) 67.72%,
      rgba(20, 48, 69, 0.3) 79.29%,
      #143345 100%
    )`
  },
  [ItemType.SW_GOLD_CARDS]: {
    background: `linear-gradient(
      90deg,
      #452e14 0%,
      rgba(69, 52, 20, 0.3) 50%,
      rgba(30, 20, 6, 0) 67.72%,
      rgba(69, 55, 20, 0.3) 79.29%,
      #453114 100%
    )`
  }
})
