import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '../../style/Theme'
import { ThemeVars } from '../../style/Theme.css'

export const OuterComponent = style({
  maxWidth: '240px',
  left: '50%',
  transform: 'translateX(-50%)',
  selectors: {
    '&.hasPricesAndBalances': {
      bottom: '-61px'
    },
    '&.hasBalancesOnly': {
      bottom: '-40px'
    },
    '&.hasPricesOnly': {
      bottom: '-15px'
    },
    '&.hasBalancesAndName': {
      bottom: '-68px'
    },
    '&.hasPricesAndName': {
      bottom: '-65px'
    },
    '&.hasPricesBalancesAndName': {
      bottom: '-97px'
    },
    '&.hasNameOnly': {
      bottom: '-36px'
    }
  }
})

export const ButtonComponentContainer = style({
  opacity: 0,
  zIndex: 4,
  transition: 'opacity 0.2s ease-in',
  top: '-8px',
  selectors: {
    '&.hasBalancesOnly': {
      top: '-68px'
    },
    '&.hasBalancesAndName': {
      top: '-44px'
    },
    '&.hasNameOnly': {
      top: '-44px'
    }
  }
})

export const TopGradient = style({
  height: '44px',
  width: '100%',
  background: `radial-gradient(49.53% 82.5% at 49.53% 100%, ${ThemeVars.color.purple1} 0%, rgba(12, 6, 30, 0.0001) 100%)`
})

export const DividerLine = style({
  width: '100%',
  height: '1px',
  background: `linear-gradient(270deg, rgba(197, 180, 245, 0.0001) 0%, ${ThemeVars.color.purple9} 27.08%, ${ThemeVars.color.purple9} 74.48%, rgba(197, 180, 245, 0.0001) 100%)`
})

export const BottomPriceGradient = style({
  zIndex: 2,
  transform: 'matrix(1, 0, 0, -1, 0, 0)',
  background: `radial-gradient(50% 82.77% at 50% 100%, ${ThemeVars.color.purple6} 0%, rgba(77, 60, 123, 0.0001) 100%)`
})

export const TopPriceGradient = style({
  zIndex: 1,
  transform: 'matrix(1, 0, 0, -1, 0, 0)',
  background: `radial-gradient(49.53% 81.16% at 49.53% 101.34%, ${ThemeVars.color.purple1} 0%, ${ThemeVars.color.purple1} 34.45%, rgba(12, 6, 30, 0.0001) 100%)`
})

export const PriceGradientWrapper = style({
  height: '28px'
})

export const PricesWrapper = style({
  zIndex: 3,
  selectors: {
    '&.hasNoPrice': {
      opacity: 0.6
    }
  }
})

export const PriceOrBalanceGrid = style({
  display: 'grid',
  gridAutoFlow: 'column',
  columnGap: '12px'
})

export const PriceImageWrapper = style({
  height: '14px',
  ...responsiveStyle({ tabletWide: { height: '16px' } })
})

export const BalancesTextWrapper = style({
  zIndex: 4,
  selectors: {
    '&.hasNoBalance': {
      opacity: 0.6
    }
  }
})

export const BalancesWrapper = style({
  height: '32px'
})
