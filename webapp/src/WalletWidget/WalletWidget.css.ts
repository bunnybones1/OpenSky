import { style } from '@vanilla-extract/css'

import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

import { WALLET_WIDGET_CLASSNAME } from './shared/constants'

export const WalletWidgetStyle = style({
  left: `${NAVBAR_WIDTH}px`,
  height: '32px',
  ...responsiveStyle({
    tablet: {
      height: '48px'
    },
    tabletWide: {
      left: '0px',
      height: '64px'
    }
  })
})

export const CurrencyIcon = style({
  height: '12px',
  width: '12px',
  ...responsiveStyle({
    tablet: {
      height: '18px',
      width: '18px'
    },
    tabletWide: {
      height: '24px',
      width: '25px'
    }
  })
})

export const CurrencyOuter = style({
  borderTopWidth: '1px',
  borderBottomWidth: '1px',
  borderStyle: 'solid',
  borderColor: ThemeVars.color.black,
  ...responsiveStyle({
    tablet: {
      borderBottomWidth: '2px',
      borderTopWidth: '2px'
    }
  })
})

export const Inner = style({
  borderTopWidth: '2px',
  borderStyle: 'solid',
  borderColor: ThemeVars.color.purple7,
  transition: '0.125s ease-in-out',
  ...responsiveStyle({
    tablet: {
      borderTopWidth: '3px'
    },
    tabletWide: {
      borderTopWidth: '4px'
    }
  }),
  selectors: {
    '&.isLogo': {
      borderColor: ThemeVars.color.purple6
    },
    [`.${WALLET_WIDGET_CLASSNAME}:hover &`]: {
      borderColor: ThemeVars.color.purple8
    },
    [`.${WALLET_WIDGET_CLASSNAME}:hover &.isLogo`]: {
      borderColor: ThemeVars.color.purple7
    }
  }
})
